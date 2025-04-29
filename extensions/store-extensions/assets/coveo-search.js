(function () {
  // Cache to store search results and reduce redundant API requests
  const searchCache = new Map();
  const querySuggestCache = new Map();

  // Use more selectors to find search form, improving compatibility
  const findSearchForm = () => {
    const selectors = [
      'partner-search form',
      'form[action*="/search"]',
      '.search-form',
      '.header__search form',
      '#search-form',
      'header form[role="search"]',
      '.search-bar form',
    ];

    for (const selector of selectors) {
      const form = document.querySelector(selector);
      if (form) return form;
    }
    return null;
  };

  // Initialize Coveo search
  const initCoveoSearch = () => {
    const coveoSearchConfig = {
      ...window?.CoveoSearch?.config,
      searchHub: 'AdminConsole',
      pipeline: 'Search',
      tab: 'default',
    };

    const searchForm = findSearchForm();
    if (!searchForm) {
      console.error('Coveo Search: Could not find search form');
      return false;
    }

    // Clear form and add required attributes
    searchForm.innerHTML = '';
    searchForm.setAttribute('novalidate', true);
    searchForm.classList.add('coveo-search-form');

    const formContentTemplate = document.getElementById('coveoSearchFormContentTemplate');
    if (!formContentTemplate) {
      console.error('Coveo Search: Missing required template');
      return false;
    }

    // Use fragment to optimize DOM operations
    const fragment = document.createDocumentFragment();
    fragment.appendChild(document.importNode(formContentTemplate.content, true));
    searchForm.appendChild(fragment);

    // Get DOM elements
    const elements = {
      input: document.getElementById('coveoSearchInput'),
      submit: document.getElementById('coveoSubmitBtn'),
      clear: document.getElementById('coveoClearBtn'),
      suggestions: document.getElementById('coveoSuggestions'),
    };

    // Return early if elements don't exist
    if (!elements.input || !elements.suggestions) {
      console.error('Coveo Search: Missing required DOM elements');
      console.error('Input exists:', !!elements.input);
      console.error('Suggestions exists:', !!elements.suggestions);
      return false;
    }

    // Get query parameter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    if (queryParam) {
      elements.input.value = queryParam;
      elements.clear.classList.remove('coveo-hidden');
    }

    let debounceTimer;
    const DEBOUNCE_DELAY = 300; // Extract constant for easier maintenance

    // API request helper - with error handling and retry logic
    const apiRequest = async (query, retryCount = 0) => {
      const cacheKey = query.toLowerCase();

      // Check if results exist in cache
      if (searchCache.has(cacheKey)) {
        return searchCache.get(cacheKey);
      }

      const companyId = localStorage.getItem('company-id');

      let defaultCatalogValue = null;
      try {
        const catalogsData = localStorage.getItem('catalogs');
        if (catalogsData) {
          const catalogs = JSON.parse(catalogsData);
          if (catalogs && catalogs.length > 0) {
            // Extract the ID part after the last '/'
            const catalogId = catalogs[0].id.split('/').pop();
            if (catalogId) {
              defaultCatalogValue = {
                value: `catalog_${catalogId}`,
                state: 'selected',
                numberOfResults: 1,
              };
            }
          }
        }
      } catch (error) {
        console.error('Error parsing catalog data:', error);
      }

      try {
        const { orgId, apiToken, ...restConfig } = coveoSearchConfig
        // Make two parallel requests for products and pages
        const [productResponse, pageResponse] = await Promise.all([
          fetch(`${coveoSearchConfig.searchUrl}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${coveoSearchConfig?.apiToken}`,
            },
            body: JSON.stringify({
              ...restConfig,
              q: query,
              debug: false,
              locale: 'en-US',
              numberOfResults: 5,
              enableDidYouMean: true,
              enableQuerySyntax: false,
              sortCriteria: 'relevancy',
              dictionaryFieldContext: {
                ec_customer_part_number_dict: companyId,
              },
              filterField: 'ec_product_id',
              facets: [
                {
                  filterFacetCount: true,
                  injectionDepth: 1000,
                  numberOfValues: 8,
                  sortCriteria: 'automatic',
                  resultsMustMatch: 'atLeastOneValue',
                  type: 'specific',
                  currentValues: [defaultCatalogValue],
                  freezeCurrentValues: false,
                  isFieldExpanded: false,
                  preventAutoSelect: false,
                  facetId: 'ec_catalog_id',
                  field: 'ec_catalog_id',
                  isHidden: true,
                  tabs: {
                    included: [],
                    excluded: [],
                  },
                  activeTab: '',
                },
              ],
            }),
          }),
          fetch(`${coveoSearchConfig?.searchUrl}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${coveoSearchConfig?.apiToken}`,
            },
            body: JSON.stringify({
              ...restConfig,
              q: query,
              debug: false,
              locale: "en-US",
              numberOfResults: 5,
              enableDidYouMean: true,
              enableQuerySyntax: false,
              sortCriteria: "relevancy",
              aq: "@objecttype==Page",
            }),
          }),
        ]);

        if (!productResponse.ok || !pageResponse.ok) {
          const errorText = !productResponse.ok
            ? await productResponse.text()
            : await pageResponse.text();
          throw new Error(`API error: ${errorText}`);
        }

        const [productData, pageData] = await Promise.all([
          productResponse.json(),
          pageResponse.json(),
        ]);

        // Combine the results
        const combinedData = {
          ...productData,
          results: [...productData.results, ...pageData.results],
        };

        // Cache results to improve performance
        searchCache.set(cacheKey, combinedData);

        // Limit cache size
        if (searchCache.size > 20) {
          const firstKey = searchCache.keys().next().value;
          searchCache.delete(firstKey);
        }

        return combinedData;
      } catch (error) {
        console.error('Coveo API request failed:', error);

        // Retry logic - up to 2 retries
        if (retryCount < 2) {
          return await new Promise((resolve) => {
            setTimeout(() => resolve(apiRequest(query, retryCount + 1)), 500);
          });
        }

        return null;
      }
    };

    // Query suggestion API request helper
    const fetchQuerySuggestions = async (query, retryCount = 0) => {
      const cacheKey = query.toLowerCase();

      // Check if results exist in cache
      if (querySuggestCache.has(cacheKey)) {
        return querySuggestCache.get(cacheKey);
      }

      try {
        const { orgId, apiToken, ...restConfig } = coveoSearchConfig
        const response = await fetch(`${coveoSearchConfig?.searchUrl}/querySuggest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${coveoSearchConfig?.apiToken}`,
          },
          body: JSON.stringify({
            ...restConfig,
            q: query,
            locale: 'en-US',
            count: 3,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Query Suggest API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        // Cache results to improve performance
        querySuggestCache.set(cacheKey, data);

        // Limit cache size
        if (querySuggestCache.size > 20) {
          const firstKey = querySuggestCache.keys().next().value;
          querySuggestCache.delete(firstKey);
        }

        return data;
      } catch (error) {
        console.error('Coveo Query Suggest API request failed:', error);

        // Retry logic - up to 1 retry
        if (retryCount < 1) {
          return await new Promise((resolve) => {
            setTimeout(() => resolve(fetchQuerySuggestions(query, retryCount + 1)), 500);
          });
        }

        return null;
      }
    };

    // Group results by object type
    const groupResults = (productResponse) => {
      const products = (productResponse?.results || []).filter((result) => result.raw.objecttype === 'Product');
      const pages = (productResponse?.results || []).filter((result) => result.raw.objecttype === 'Page');

      return { products, pages };
    };

    // Highlight search term in text
    const highlightSearchTerm = (userQuery, text, domElement) => {
      if (userQuery && text) {
        const lowerText = text.toLowerCase();
        const queryIndex = lowerText.indexOf(userQuery);

        if (queryIndex !== -1) {
          // Clear title container
          domElement.innerHTML = '';

          // Add text before the search term
          if (queryIndex > 0) {
            const beforeSpan = document.createElement('span');
            beforeSpan.textContent = text.substring(0, queryIndex);
            domElement.appendChild(beforeSpan);
          }

          // Add highlighted search term
          const querySpan = document.createElement('span');
          querySpan.textContent = text.substring(queryIndex, queryIndex + userQuery.length);
          querySpan.classList.add('coveo-search-title-highlight');
          domElement.appendChild(querySpan);

          // Add text after the search term
          if (queryIndex + userQuery.length < text.length) {
            const afterSpan = document.createElement('span');
            afterSpan.textContent = text.substring(queryIndex + userQuery.length);
            domElement.appendChild(afterSpan);
          }
        } else {
          // If no match found, set text directly
          domElement.textContent = text;
        }
      } else {
        // If no search term, set text directly
        domElement.textContent = text || '';
      }
    };

    // Get product suggestions
    const getProductSuggestions = async (query) => {
      if (!query.trim()) {
        elements.suggestions.classList.add('coveo-hidden');
        elements.suggestions.innerHTML = '';
        return;
      }

      // Show loading state
      elements.input.classList.add('coveo-loading');

      // Fetch both product suggestions and query suggestions in parallel
      const [productResponse, querySuggestResponse] = await Promise.all([apiRequest(query), fetchQuerySuggestions(query)]);

      const { products, pages } = groupResults(productResponse);

      // Remove loading state
      elements.input.classList.remove('coveo-loading');

      const hasProducts = products.length > 0;
      const hasPages = pages.length > 0;
      const hasQuerySuggestions = querySuggestResponse?.completions && querySuggestResponse.completions.length > 0;

      // Always hide suggestions if there are no results of any kind
      if (!hasProducts && !hasPages && !hasQuerySuggestions) {
        elements.suggestions.classList.add('coveo-hidden');
        elements.suggestions.innerHTML = '';
        return;
      }

      // Use DocumentFragment to optimize DOM operations
      const suggestionsFragment = document.createDocumentFragment();
      elements.suggestions.innerHTML = '';

      // Add query suggestions if available
      if (hasQuerySuggestions) {
        // Add query suggestions header
        const headerTemplate = document.getElementById('coveoQuerySuggestionHeaderTemplate');
        if (headerTemplate) {
          suggestionsFragment.appendChild(document.importNode(headerTemplate.content, true));
        }

        // Add query suggestions
        const suggestionTemplate = document.getElementById('coveoQuerySuggestionTemplate');
        if (suggestionTemplate) {
          querySuggestResponse.completions.forEach((suggestion) => {
            const itemFragment = document.importNode(suggestionTemplate.content, true);

            const li = itemFragment.querySelector('li');
            const text = li.querySelector('.coveo-query-suggestion-text');

            // Clear existing content
            text.innerHTML = '';

            // Parse the highlighted property to create highlighted text
            if (suggestion.highlighted) {
              // Remove outer quotes if present
              const highlighted = suggestion.highlighted.replace(/^"(.*)"$/, '$1');

              // Get user's input query for proper highlighting
              const userQuery = elements.input.value.trim().toLowerCase();

              if (userQuery && suggestion.expression) {
                // Create a simple text node with the full expression
                const expressionText = suggestion.expression;

                // Find the index of the user query in the expression (case insensitive)
                const lowerExpression = expressionText.toLowerCase();
                const queryIndex = lowerExpression.indexOf(userQuery);

                if (queryIndex !== -1) {
                  // Add text before the query
                  if (queryIndex > 0) {
                    const beforeSpan = document.createElement('span');
                    beforeSpan.textContent = expressionText.substring(0, queryIndex);
                    text.appendChild(beforeSpan);
                  }

                  // Add the highlighted query part
                  const querySpan = document.createElement('span');
                  querySpan.textContent = expressionText.substring(queryIndex, queryIndex + userQuery.length);
                  querySpan.classList.add('coveo-suggestion-highlight');
                  text.appendChild(querySpan);

                  // Add text after the query
                  if (queryIndex + userQuery.length < expressionText.length) {
                    const afterSpan = document.createElement('span');
                    afterSpan.textContent = expressionText.substring(queryIndex + userQuery.length);
                    text.appendChild(afterSpan);
                  }
                } else {
                  // Fallback if the query isn't directly found in the expression
                  text.textContent = expressionText;
                }
              } else {
                // Fallback to the previous method of highlighted parsing
                let inHighlight = false;
                let currentPart = '';

                for (let i = 0; i < highlighted.length; i++) {
                  const char = highlighted[i];

                  if (char === '[') {
                    // Start of highlighted text
                    // First add any accumulated non-highlighted text
                    if (currentPart) {
                      const span = document.createElement('span');
                      span.textContent = currentPart;
                      text.appendChild(span);
                      currentPart = '';
                    }
                    inHighlight = true;
                  } else if (char === ']') {
                    // End of highlighted text
                    if (currentPart) {
                      const span = document.createElement('span');
                      span.textContent = currentPart;
                      // This is the highlighted part
                      span.classList.add('coveo-suggestion-highlight');
                      text.appendChild(span);
                      currentPart = '';
                    }
                    inHighlight = false;
                  } else if (char !== '{' && char !== '}') {
                    // Ignore { and } markers
                    // Regular character, add to current part
                    currentPart += char;
                  }
                }

                // Add any remaining text
                if (currentPart) {
                  const span = document.createElement('span');
                  span.textContent = currentPart;
                  if (inHighlight) {
                    span.classList.add('coveo-suggestion-highlight');
                  }
                  text.appendChild(span);
                }
              }
            } else {
              // Fallback if highlighted property isn't available
              text.textContent = suggestion.expression;
            }

            // Store the suggestion for easy access when clicked
            li.dataset.suggestion = suggestion.expression;

            suggestionsFragment.appendChild(itemFragment);
          });
        }

        // Add separator if we also have products
        if (hasProducts) {
          const separatorTemplate = document.getElementById('coveoSeparatorTemplate');
          if (separatorTemplate) {
            suggestionsFragment.appendChild(document.importNode(separatorTemplate.content, true));
          }
        }
        // Add separator if we also have pages
        if (hasPages) {
          const separatorTemplate = document.getElementById('coveoSeparatorTemplate');
          if (separatorTemplate) {
            suggestionsFragment.appendChild(document.importNode(separatorTemplate.content, true));
          }
        }
      }

      // Add product suggestions if available
      if (hasProducts) {
        // Add header
        const productHeaderTemplate = document.getElementById('coveoProductHeaderTemplate');
        if (productHeaderTemplate) {
          suggestionsFragment.appendChild(document.importNode(productHeaderTemplate.content, true));
        }

        // Add product suggestions
        const productTemplate = document.getElementById('coveoProductSuggestionTemplate');
        if (productTemplate) {
          products.forEach((result) => {
            const itemFragment = document.importNode(productTemplate.content, true);

            const li = itemFragment.querySelector('li');
            const img = li.querySelector('img');
            const title = li.querySelector('.coveo-product-suggestion-title');
            const sku = li.querySelector('.coveo-product-suggestion-sku');
            const partnerNumber = li.querySelector('.coveo-customer-partner-number');
            const imageSrc = result.raw.ec_images?.[0] || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';

            // Set image attributes, including missing width and height
            img.src = imageSrc;
            img.alt = result?.raw?.ec_name || '';
            img.width = 60;
            img.height = 60;
            img.loading = 'lazy'; // Lazy loading for better performance

            // Highlight search term in product title
            const userQuery = elements.input.value.trim().toLowerCase();
            highlightSearchTerm(userQuery, result?.raw?.ec_product_name, title);

            sku.textContent = result?.raw?.ec_sku || '';
            partnerNumber.textContent = result?.raw?.ec_customer_part_number_dict || '';

            // Use the same URL pattern as the "See all" link for product detail pages
            li.dataset.url = `/products/${result.raw.ec_pdp_url}`;

            suggestionsFragment.appendChild(itemFragment);
          });
        }

        // // Add "See all" link
        // const seeAllTemplate = document.getElementById(
        //   "coveoSeeAllResultsTemplate",
        // );
        // if (seeAllTemplate) {
        //   const seeAllFragment = document.importNode(
        //     seeAllTemplate.content,
        //     true,
        //   );
        //   const link = seeAllFragment.querySelector(".coveo-see-all-link");

        //   // If there's only one product result, link directly to the product page
        //   if (products.length === 1 && pages.length === 0) {
        //     link.href = `/products/${products[0].raw.ec_pdp_url}`;
        //   } else {
        //     // Multiple results - link to search page
        //     link.href = `/search?q=${encodeURIComponent(query)}`;
        //   }

        //   suggestionsFragment.appendChild(seeAllFragment);
        // }
      }

      // Add pages suggestions if available
      if (hasPages) {
        // Add header
        const pageHeaderTemplate = document.getElementById('coveoPageHeaderTemplate');
        if (pageHeaderTemplate) {
          suggestionsFragment.appendChild(document.importNode(pageHeaderTemplate.content, true));
        }

        // Add pages suggestions
        const pageTemplate = document.getElementById('coveoPageSuggestionTemplate');
        if (pageTemplate) {
          pages.forEach((result) => {
            const itemFragment = document.importNode(pageTemplate.content, true);

            const li = itemFragment.querySelector('li');
            const title = li.querySelector('.coveo-page-suggestion-title');
            const previewBody = li.querySelector('.coveo-page-suggestion-preview-body');

            const userQuery = elements.input.value.trim().toLowerCase();
            // Highlight search term in page title
            highlightSearchTerm(userQuery, result?.raw?.title, title);

            // Highlight the search term in the preview body
            highlightSearchTerm(userQuery, result?.raw?.body, previewBody);

            // Use the same URL pattern as the "See all" link for page detail pages
            li.dataset.url = `/pages/${result.raw.ec_handle}`;

            suggestionsFragment.appendChild(itemFragment);
          });
        }
      }

      // Add "See all" link to the end of the suggestions if there are products
      if (hasProducts) {
        const seeAllTemplate = document.getElementById('coveoSeeAllResultsTemplate');
        if (seeAllTemplate) {
          const seeAllFragment = document.importNode(seeAllTemplate.content, true);
          const link = seeAllFragment.querySelector('.coveo-see-all-link');

          // If there's only one product result, link directly to the product page
          if (products.length === 1) {
            link.href = `/products/${products[0].raw.ec_pdp_url}`;
          } else {
            // Multiple results - link to search page
            link.href = `/search?q=${encodeURIComponent(query)}`;
          }

          suggestionsFragment.appendChild(seeAllFragment);
        }
      }

      // Append all suggestions to the container
      elements.suggestions.appendChild(suggestionsFragment);

      // Force reflow to ensure CSS transitions work correctly
      elements.suggestions.offsetHeight;

      // Show suggestions - explicitly set style to ensure visibility
      elements.suggestions.classList.remove('coveo-hidden');
    };

    // Use event delegation to handle suggestion item clicks
    elements.suggestions.addEventListener('click', (e) => {
      const productSuggestion = e.target.closest('.coveo-product-suggestion');
      const pageSuggestion = e.target.closest('.coveo-page-suggestion');
      const querySuggestion = e.target.closest('.coveo-query-suggestion');

      if (productSuggestion && productSuggestion.dataset.url) {
        window.location.href = productSuggestion.dataset.url;
      } else if (querySuggestion && querySuggestion.dataset.suggestion) {
        // Handle query suggestion click
        elements.input.value = querySuggestion.dataset.suggestion;
        elements.suggestions.classList.add('coveo-hidden');
        elements.clear.classList.remove('coveo-hidden');

        // Submit the form with the selected suggestion
        searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
      } else if (pageSuggestion && pageSuggestion.dataset.url) {
        // Handle page suggestion click
        window.location.href = pageSuggestion.dataset.url;
      }
    });

    // Input event handling
    elements.input.addEventListener('input', (e) => {
      const query = e.target.value.trim();

      elements.clear.classList.toggle('coveo-hidden', !query);
      clearTimeout(debounceTimer);

      if (query) {
        debounceTimer = setTimeout(() => getProductSuggestions(query), DEBOUNCE_DELAY);
      } else {
        elements.suggestions.classList.add('coveo-hidden');
        elements.suggestions.innerHTML = '';
      }
    });

    // Add focus event to show suggestions immediately when input is focused
    elements.input.addEventListener('focus', (e) => {
      const query = e.target.value.trim();

      // If there's already text in the input, show suggestions immediately
      if (query) {
        getProductSuggestions(query);
      } else {
        // For empty input, fetch default suggestions or recent searches
        fetchDefaultSuggestions();
      }
    });

    // Function to fetch default suggestions when input is empty
    const fetchDefaultSuggestions = async () => {
      // Show loading state
      elements.input.classList.add('coveo-loading');

      try {
        // Get popular/trending searches or recent searches
        const querySuggestResponse = await fetchQuerySuggestions('');

        // Remove loading state
        elements.input.classList.remove('coveo-loading');

        const hasQuerySuggestions = querySuggestResponse?.completions && querySuggestResponse.completions.length > 0;

        if (!hasQuerySuggestions) {
          elements.suggestions.classList.add('coveo-hidden');
          return;
        }

        // Use DocumentFragment to optimize DOM operations
        const suggestionsFragment = document.createDocumentFragment();
        elements.suggestions.innerHTML = '';

        // Add default suggestions header
        const headerTemplate = document.getElementById('coveoQuerySuggestionHeaderTemplate');
        if (headerTemplate) {
          const headerFragment = document.importNode(headerTemplate.content, true);
          const header = headerFragment.querySelector('.coveo-suggestion-header');
          header.textContent = 'Popular Searches';
          suggestionsFragment.appendChild(headerFragment);
        }

        // Add query suggestions
        const suggestionTemplate = document.getElementById('coveoQuerySuggestionTemplate');
        if (suggestionTemplate) {
          querySuggestResponse.completions.forEach((suggestion) => {
            const itemFragment = document.importNode(suggestionTemplate.content, true);

            const li = itemFragment.querySelector('li');
            const text = li.querySelector('.coveo-query-suggestion-text');

            // Just use the expression for default suggestions
            text.textContent = suggestion.expression;

            // Store the suggestion for easy access when clicked
            li.dataset.suggestion = suggestion.expression;

            suggestionsFragment.appendChild(itemFragment);
          });
        }

        elements.suggestions.appendChild(suggestionsFragment);
        // Force reflow
        elements.suggestions.offsetHeight;
        elements.suggestions.classList.remove('coveo-hidden');
      } catch (error) {
        console.error('Error fetching default suggestions:', error);
        elements.input.classList.remove('coveo-loading');
        elements.suggestions.classList.add('coveo-hidden');
      }
    };

    // Form submission handling
    searchForm.addEventListener('submit', async (e) => {
      const query = elements.input.value.trim();
      if (!query) {
        e.preventDefault(); // Prevent submitting empty queries
        return;
      }

      e.preventDefault(); // Prevent default submission while we check
      elements.input.classList.add('coveo-loading');

      // Check if we have results in cache, if not, fetch them
      const cacheKey = query.toLowerCase();
      let productResponse;

      if (searchCache.has(cacheKey)) {
        productResponse = searchCache.get(cacheKey);
      } else {
        // Need to fetch results first
        productResponse = await apiRequest(query);
      }
      const { products, pages } = groupResults(productResponse);

      elements.input.classList.remove('coveo-loading');

      // Redirect logic
      if (products.length === 1 && pages.length === 0) {
        window.location.href = `/products/${products[0].raw.ec_pdp_url}`;
      } else {
        // Multiple results - go to search page
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
      }

      elements.suggestions.classList.add('coveo-hidden');
    });

    // Submit button click event - use the form submission handler
    elements.submit.addEventListener('click', () => {
      if (elements.input.value.trim()) {
        searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    // Clear button event
    elements.clear.addEventListener('click', () => {
      elements.input.value = '';
      elements.clear.classList.add('coveo-hidden');
      elements.suggestions.classList.add('coveo-hidden');
      elements.suggestions.innerHTML = '';

      // Focus back to search box
      elements.input.focus();

      // Remove query parameter from URL without page refresh
      const url = new URL(window.location.href);
      if (url.searchParams.has('q')) {
        url.searchParams.delete('q');
        window.history.replaceState({}, '', url.toString());
      }

      // Make an API request with empty query to refresh search results
      apiRequest('');
      window.location.reload();
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.coveo-search-container') && !e.target.closest('#coveoSuggestions')) {
        elements.suggestions.classList.add('coveo-hidden');
      }
    });

    // Add keyboard navigation support
    elements.input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const query = elements.input.value.trim();
        if (!query) return;

        // Check if suggestions are visible and has focus
        const suggestions = elements.suggestions.querySelectorAll('.coveo-suggestion-item');
        const focusedIndex = Array.from(suggestions).findIndex((item) => item.classList.contains('focused'));

        // If a suggestion is focused, let the original handler take care of it
        if (focusedIndex >= 0) return;

        // Otherwise, handle the Enter key press like a form submission
        e.preventDefault();
        searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
        return;
      }

      if (elements.suggestions.classList.contains('coveo-hidden')) return;

      const suggestions = elements.suggestions.querySelectorAll('.coveo-suggestion-item');
      if (!suggestions.length) return;

      let focusedIndex = Array.from(suggestions).findIndex((item) => item.classList.contains('focused'));

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (focusedIndex < 0) {
            focusedIndex = 0;
          } else {
            focusedIndex = (focusedIndex + 1) % suggestions.length;
          }
          updateFocus(suggestions, focusedIndex);
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (focusedIndex < 0) {
            focusedIndex = suggestions.length - 1;
          } else {
            focusedIndex = (focusedIndex - 1 + suggestions.length) % suggestions.length;
          }
          updateFocus(suggestions, focusedIndex);
          break;

        case 'Enter':
          if (focusedIndex >= 0) {
            e.preventDefault();
            const focusedItem = suggestions[focusedIndex];

            if (focusedItem.classList.contains('coveo-product-suggestion') && focusedItem.dataset.url) {
              window.location.href = focusedItem.dataset.url;
            } else if (focusedItem.classList.contains('coveo-query-suggestion') && focusedItem.dataset.suggestion) {
              elements.input.value = focusedItem.dataset.suggestion;
              elements.suggestions.classList.add('coveo-hidden');
              elements.clear.classList.remove('coveo-hidden');
              searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
            } else if (focusedItem.classList.contains('coveo-page-suggestion') && focusedItem.dataset.url) {
              window.location.href = focusedItem.dataset.url;
            }
          }
          break;

        case 'Escape':
          elements.suggestions.classList.add('coveo-hidden');
          elements.input.focus();
          break;
      }
    });

    // Helper function to update focus
    function updateFocus(suggestions, index) {
      suggestions.forEach((item) => item.classList.remove('focused'));
      if (index >= 0 && index < suggestions.length) {
        suggestions[index].classList.add('focused');
        suggestions[index].scrollIntoView({ block: 'nearest' });
      }
    }

    // Initial clear button visibility
    if (elements.input.value) {
      elements.clear.classList.remove('coveo-hidden');
    }

    return true;
  };

  // Initialize on page load
  const initOnLoad = () => {
    if (!initCoveoSearch()) {
      // Use MutationObserver to wait for DOM to be ready
      const observer = new MutationObserver((mutations) => {
        if (findSearchForm()) {
          observer.disconnect();
          initCoveoSearch();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // Set timeout to ensure initialization eventually happens
      setTimeout(() => {
        if (!document.querySelector('.coveo-search-form')) {
          initCoveoSearch();
          observer.disconnect();
        }
      }, 2000);
    }
  };

  // Check if document is already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnLoad);
  } else {
    initOnLoad();
  }
})();
