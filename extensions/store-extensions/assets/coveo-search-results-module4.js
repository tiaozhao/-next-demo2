(() => {
  // Main search results class
  class CoveoSearchResults {
    constructor() {
      const mainContent = document.getElementById("MainContent");
      if (!mainContent) {
        console.error("Coveo Search Results: #MainContent element not found");
        return;
      }

      const searchResultsTemplate = document.getElementById(
        "shopify-section-coveo-search-results",
      );
      if (!searchResultsTemplate) {
        console.error(
          "Coveo Search Results: Search results template not found",
        );
        return;
      }

      mainContent.innerHTML = "";
      mainContent.appendChild(searchResultsTemplate.content.cloneNode(true));

      if (!this.validateRequiredElements()) {
        console.error("Coveo Search Results: Required elements not found");
        return;
      }

      // Initialize selectedFacets earlier, before calling methods that might use it
      this.selectedFacets = {};
      this.currentPage = 1;

      this.initializeElements();
      this.initializeMobileElements();
      this.initializeViewMode();

      const { ResultRenderer, FacetRenderer } =
        window.CoveoRenderersModule || {};
      this.resultRenderer = new ResultRenderer(
        document.getElementById("coveoResultTemplate"),
        "en-US",
      );
      this.facetRenderer = new FacetRenderer(
        document.getElementById("coveoFacetTemplate"),
        document.getElementById("coveoFacetValueTemplate"),
      );

      // Track facet state for pagination
      this.facetState = {};

      this.init();
    }

    validateRequiredElements() {
      const requiredElements = [
        "coveoResultTemplate",
        "coveoResultsList",
        "coveoPagination",
        "coveoFacetTemplate",
        "coveoFacetValueTemplate",
        "coveoFacetList",
      ];

      for (const elementId of requiredElements) {
        if (!document.getElementById(elementId)) {
          console.error(
            `Coveo Search Results: Required element "${elementId}" not found`,
          );
          return false;
        }
      }

      return true;
    }

    initializeElements() {
      this.resultsContainer = document.getElementById("coveoResultsList");
      this.paginationContainer = document.getElementById("coveoPagination");
      this.sortDropdown = document.getElementById("coveoSortDropdown");
      this.resultCountElement = document.getElementById("coveoResultCount");
      this.perPageDropdown = document.getElementById("coveoPerPageDropdown");
      this.facetListContainer = document.getElementById("coveoFacetList");
      this.facetSidebarMobileFiltersCount = document.getElementById(
        "coveoFacetSidebarMobileFiltersCount",
      );
      this.viewButtons = document.querySelectorAll(".view-button");

      if (
        !this.resultsContainer ||
        !this.paginationContainer ||
        !this.facetListContainer
      ) {
        console.error("Coveo Search Results: Required containers not found");
        return false;
      }

      // Initialize UI control events
      this.initializeControls();

      return true;
    }

    initializeControls() {
      if (this.sortDropdown) {
        this.sortDropdown.addEventListener("change", () => {
          this.currentPage = 1;
          this.performSearch(this.getCurrentQuery());
        });
      }

      if (this.perPageDropdown) {
        // Set default value from config if it exists
        const { CoveoConfig } = window.CoveoConfigModule || {};
        if (CoveoConfig.resultsPerPage) {
          this.perPageDropdown.value = CoveoConfig.resultsPerPage.toString();
        }

        // Sync the initial per page value from the dropdown to the config
        CoveoConfig.resultsPerPage = parseInt(this.perPageDropdown.value);

        this.perPageDropdown.addEventListener("change", () => {
          // Update the config when the per page value changes
          CoveoConfig.resultsPerPage = parseInt(this.perPageDropdown.value);
          this.currentPage = 1;
          this.performSearch(this.getCurrentQuery());
        });
      }

      // Add event listener for the clear all button
      const clearAllButton = document.querySelector(
        ".coveo-facet-sidebar-clear",
      );
      if (clearAllButton) {
        // Initially hide the button since no facets are selected on page load
        this.updateClearAllButtonVisibility();

        clearAllButton.addEventListener("click", () => {
          // Clear the selected facets data structure
          this.selectedFacets = {};

          // Update UI by clearing the selected filters container
          const selectedFiltersContainer = document.getElementById(
            "coveoSelectedFilters",
          );
          if (selectedFiltersContainer) {
            selectedFiltersContainer.innerHTML = "";
          }

          // Hide the clear all button
          this.updateClearAllButtonVisibility();

          // Save facets to URL after clearing
          this.saveFacetsToUrl();

          // Reset to first page and perform a new search without filters
          this.currentPage = 1;
          this.performSearch(this.getCurrentQuery());
        });
      }
    }

    initializeMobileElements() {
      this.facetSidebarMobileFilters = document.querySelector(
        ".coveo-facet-sidebar-mobile-filters",
      );
      this.isMobileSelectionActive = false; // Flag to track if we're in mobile selection mode

      // Create the mobile modal from the template
      const mobileModalTemplate = document.getElementById(
        "coveo-facet-mobile-modal",
      );
      if (mobileModalTemplate) {
        // Clone the template content
        const modalContent = mobileModalTemplate.content.cloneNode(true);

        // Append it to the body
        document.body.appendChild(modalContent);

        // Now we can select the elements that were just added to the DOM
        this.facetSidebarMobileModal = document.querySelector(
          ".coveo-facet-mobile-modal",
        );
        this.facetSidebarMobileModalClose = document.querySelector(
          ".coveo-facet-mobile-modal-close",
        );
        this.facetSidebarMobileModalApply = document.querySelector(
          ".coveo-facet-mobile-modal-apply",
        );
        this.facetSidebarMobileClear = document.querySelector(
          ".coveo-facet-mobile-modal-clear",
        );

        // Get the mobile facet container where we'll render facets
        this.mobileFacetContainer = this.facetSidebarMobileModal.querySelector(
          ".coveo-facet-mobile-modal-content",
        );
      } else {
        console.error("Mobile modal template not found");
      }

      // Check if we should show mobile elements based on screen width
      this.updateMobileVisibility();

      // Add resize listener to update mobile visibility on window resize
      window.addEventListener("resize", this.updateMobileVisibility.bind(this));

      // Add event listeners for mobile interactions
      if (this.facetSidebarMobileFilters) {
        this.facetSidebarMobileFilters.addEventListener("click", () => {
          // Only proceed if we're in mobile view
          if (window.innerWidth >= 750) return;

          // Save current state when opening modal
          this.tempSelectedFacets = JSON.parse(
            JSON.stringify(this.selectedFacets || {}),
          );
          this.tempSortValue = this.sortDropdown
            ? this.sortDropdown.value
            : "relevance";

          // Set flag to indicate we're in mobile selection mode
          this.isMobileSelectionActive = true;

          // Open the modal when mobile filters button is clicked
          if (this.facetSidebarMobileModal) {
            this.facetSidebarMobileModal.classList.add("active");
            document.body.classList.add("modal-open");

            // Render facets directly into the mobile modal
            this.renderMobileFacets();

            // Ensure the mobile sort dropdown gets the value from the main sort dropdown
            const mobileSortDropdown =
              this.facetSidebarMobileModal.querySelector(
                "#coveoMobileSortDropdown",
              );
            if (mobileSortDropdown && this.sortDropdown) {
              // Initial sync of values
              mobileSortDropdown.value = this.sortDropdown.value;

              // Add event listener without immediate search
              mobileSortDropdown.addEventListener("change", (event) => {
                // Just store the value, don't apply yet
                this.tempSortValue = event.target.value;
              });
            }
          }
        });
      }

      if (this.facetSidebarMobileModalClose) {
        this.facetSidebarMobileModalClose.addEventListener("click", () => {
          // Close the modal when close button is clicked
          if (this.facetSidebarMobileModal) {
            this.facetSidebarMobileModal.classList.remove("active");
            document.body.classList.remove("modal-open");

            // Restore original facet selections since we're cancelling
            this.selectedFacets = JSON.parse(
              JSON.stringify(this.tempSelectedFacets || {}),
            );

            // Reset to original sort value
            if (this.sortDropdown && this.tempSortValue) {
              this.sortDropdown.value = this.tempSortValue;
            }

            // Turn off mobile selection mode
            this.isMobileSelectionActive = false;
          }
        });
      }

      if (this.facetSidebarMobileModalApply) {
        this.facetSidebarMobileModalApply.addEventListener("click", () => {
          // Apply sort value to the main dropdown
          const mobileSortDropdown = this.facetSidebarMobileModal.querySelector(
            "#coveoMobileSortDropdown",
          );
          if (mobileSortDropdown && this.sortDropdown) {
            this.sortDropdown.value = mobileSortDropdown.value;
          }

          // Close modal
          if (this.facetSidebarMobileModal) {
            this.facetSidebarMobileModal.classList.remove("active");
            document.body.classList.remove("modal-open");
          }

          // Turn off mobile selection mode
          this.isMobileSelectionActive = false;

          // Update the selected filters display
          this.renderSelectedFilters();

          // Update the visibility of the Clear All button
          this.updateClearAllButtonVisibility();

          // Save facets to URL after applying in mobile mode
          this.saveFacetsToUrl();

          // Perform search with current filters
          this.currentPage = 1;
          this.performSearch(this.getCurrentQuery());
        });
      }

      if (this.facetSidebarMobileClear) {
        this.facetSidebarMobileClear.addEventListener("click", () => {
          // Clear all filters in the selected facets object
          this.selectedFacets = {};

          // Reset the mobile sort dropdown to the default (first) option
          const mobileSortDropdown = this.facetSidebarMobileModal.querySelector(
            "#coveoMobileSortDropdown",
          );
          if (mobileSortDropdown) {
            mobileSortDropdown.value = "relevance";
            this.tempSortValue = "relevance";
          }

          // Update UI state - uncheck all checkboxes
          const checkboxes = this.facetSidebarMobileModal.querySelectorAll(
            ".coveo-facet-checkbox",
          );
          checkboxes.forEach((checkbox) => {
            checkbox.checked = false;

            // Also update any visual indicators
            const checkboxContainer = checkbox.closest(".coveo-checkbox");
            if (checkboxContainer) {
              checkboxContainer.classList.remove("checked");
            }
          });

          // Close the modal
          if (this.facetSidebarMobileModal) {
            this.facetSidebarMobileModal.classList.remove("active");
            document.body.classList.remove("modal-open");
          }

          // Turn off mobile selection mode
          this.isMobileSelectionActive = false;

          // Update the selected filters display
          this.renderSelectedFilters();

          // Update the visibility of the Clear All button
          this.updateClearAllButtonVisibility();

          // Save facets to URL after clearing
          this.saveFacetsToUrl();

          // Perform search with cleared filters
          this.currentPage = 1;
          this.performSearch(this.getCurrentQuery());
        });
      }
    }

    // New method to render facets in the mobile modal
    renderMobileFacets() {
      if (!this.mobileFacetContainer) return;

      // Don't clear the entire content as it contains the sort dropdown from the template
      // Only remove the facet list if it exists
      const existingFacetList = this.mobileFacetContainer.querySelector(
        "#coveoMobileFacetList",
      );
      if (existingFacetList) {
        existingFacetList.remove();
      }

      // Initialize the mobile sort dropdown value from the main dropdown
      const mobileSortDropdown = this.mobileFacetContainer.querySelector(
        "#coveoMobileSortDropdown",
      );
      if (mobileSortDropdown && this.sortDropdown) {
        mobileSortDropdown.value = this.sortDropdown.value;
      }

      // Get the current facets from the API response
      const { facets } = window.lastSearchResponse || {};

      if (!facets || facets.length === 0) {
        const noFacetsDiv = document.createElement("div");
        noFacetsDiv.className = "coveo-no-facets";
        noFacetsDiv.textContent = "No filters available";
        this.mobileFacetContainer.appendChild(noFacetsDiv);
        return;
      }

      // Create container for facets
      const facetListDiv = document.createElement("div");
      facetListDiv.id = "coveoMobileFacetList";
      facetListDiv.className = "coveo-facet-list";
      this.mobileFacetContainer.appendChild(facetListDiv);

      // Use the facet renderer to create the facet UI with our handler
      const showMoreHandler = this.handleShowMoreFacetValues.bind(this);
      showMoreHandler.facetState = this.facetState || {};

      const facetFragment = this.facetRenderer.renderFacets(
        facets,
        this.selectedFacets,
        this.handleMobileFacetSelect.bind(this),
        showMoreHandler,
      );

      facetListDiv.appendChild(facetFragment);
    }

    // Special handler for mobile facet selection
    handleMobileFacetSelect(
      facetId,
      value,
      isSelected,
      facetType = "specific",
    ) {
      // Use the utility function to update selected facets
      const { FacetUtils } = window.CoveoUtilsModule || {};
      this.selectedFacets = FacetUtils.updateFacetSelection(
        this.selectedFacets,
        facetId,
        value,
        isSelected,
        facetType,
      );

      // Always update the filter tags display
      this.renderSelectedFilters();

      // In mobile mode, we don't perform search immediately
      if (!this.isMobileSelectionActive) {
        // Only in desktop mode do we update Clear All visibility and search
        this.updateClearAllButtonVisibility();
        this.currentPage = 1;

        // Save facets to URL when selecting in desktop mode
        this.saveFacetsToUrl();

        this.performSearch(this.getCurrentQuery());
      }
    }

    // Modify handleFacetSelect to use our new mobile handler when in mobile mode
    handleFacetSelect(facetId, value, isSelected, facetType = "specific") {
      // Always delegate to our common handler
      this.handleMobileFacetSelect(facetId, value, isSelected, facetType);
    }

    // Update the method to handle the case when selectedFacets might not be initialized:
    updateClearAllButtonVisibility() {
      const clearAllButton = document.querySelector(
        ".coveo-facet-sidebar-clear",
      );
      if (clearAllButton) {
        // Check if selectedFacets exists and has any keys
        const hasFacets =
          this.selectedFacets && Object.keys(this.selectedFacets).length > 0;
        clearAllButton.style.display = hasFacets ? "block" : "none";
      }
    }

    init() {
      // Get the query from URL parameters
      const query = this.getCurrentQuery();

      // Load facets from URL
      this.loadFacetsFromUrl();

      // Perform search with current query
      // No need to show loading here since the main loading overlay is still visible
      this.performSearch(query);

      // Set up resize event for mobile/desktop view
      window.addEventListener(
        "resize",
        debounce(() => {
          this.updateMobileVisibility();
        }, 250),
      );

      // Initial check for mobile/desktop view
      this.updateMobileVisibility();
    }

    async performSearch(query, page = 1) {
      this.currentPage = page;
      this.showLoadingState();

      try {
        const searchParams = this.buildSearchParams(query, page);
        const response = await this.executeSearch(searchParams);
        this.handleSearchResponse(response);
      } catch (error) {
        this.handleSearchError(error);
      } finally {
        this.hideLoadingState();
      }
    }

    renderResults(results) {
      if (!this.resultsContainer) return;

      this.resultsContainer.innerHTML = "";

      if (!results.length) {
        return;
      }

      results.forEach((result) => {
        const resultElement = this.resultRenderer.renderResult(result);
        this.resultsContainer.appendChild(resultElement);
      });
    }

    renderFacets(facets) {
      if (!facets || !this.facetListContainer) {
        return;
      }

      // Filter out any hidden facets that should not be shown in the UI
      const visibleFacets = facets.filter((facet) => {
        // Get the facet definition from config
        const { CoveoConfig } = window.CoveoConfigModule || {};
        const facetDef = CoveoConfig.facets.find(
          (f) => f.facetId === facet.facetId,
        );
        // Skip facets marked as hidden
        return !(facetDef && facetDef.isHidden === true);
      });

      // Clear existing facets
      this.facetListContainer.innerHTML = "";

      // Use the common showMore handler for both desktop and mobile
      const showMoreHandler = this.handleShowMoreFacetValues.bind(this);
      showMoreHandler.facetState = this.facetState || {};

      // Render the facets using the renderer
      const facetFragment = this.facetRenderer.renderFacets(
        visibleFacets,
        this.selectedFacets,
        this.handleFacetSelect.bind(this),
        showMoreHandler,
      );

      // Append facets to container
      this.facetListContainer.appendChild(facetFragment);
    }

    handleShowMoreFacetValues(facetId, facetType, expand = true) {
      const { CoveoConfig } = window.CoveoConfigModule || {};
      // Initialize state for this facet if it doesn't exist
      if (!this.facetState[facetId]) {
        const facetConfig = CoveoConfig.facets.find(
          (f) => f.facetId === facetId,
        );
        this.facetState[facetId] = {
          currentPage: 1,
          pageSize: facetConfig?.numberOfValues || 8,
          defaultNumberOfValues: facetConfig?.numberOfValues || 8,
          isExpanded: false,
        };
      }

      if (expand) {
        // Handle "Show more" - Increment the page for this facet
        this.facetState[facetId].currentPage++;
        this.facetState[facetId].isExpanded = true;
      } else {
        // Handle "Show less" - Reset to default values
        this.facetState[facetId].currentPage = 1;
        this.facetState[facetId].isExpanded = false;
      }

      // Request updated facet values
      this.performFacetSearch(facetId, facetType);
    }

    async performFacetSearch(facetId, facetType) {
      this.showLoadingState();

      try {
        // Build the search params, but modify the specific facet to request more values
        const query = this.getCurrentQuery();
        const params = this.buildSearchParams(query, this.currentPage);

        // Find and update the target facet
        const facetIndex = params.facets.findIndex(
          (f) => f.facetId === facetId,
        );
        if (facetIndex !== -1) {
          const facetState = this.facetState[facetId];
          params.facets[facetIndex].numberOfValues =
            facetState.currentPage * facetState.pageSize;
        }

        // Execute the search
        const response = await this.executeSearch(params);
        this.handleSearchResponse(response);
      } catch (error) {
        this.handleSearchError(error);
      } finally {
        this.hideLoadingState();
      }
    }

    getCurrentQuery() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("q") || "";
    }

    showLoadingState() {
      // Instead of adding a class to the results container,
      // we'll check if the initial loading overlay is still visible
      const initialLoading = document.getElementById("coveo-initial-loading");
      if (initialLoading && initialLoading.style.display !== "none") {
        // Initial loading is still visible, so we don't need to show anything else
        return;
      }

      // Only add a loading class, don't show a separate indicator
      if (this.resultsContainer) {
        this.resultsContainer.classList.add("loading");
        this.resultsContainer.setAttribute("aria-busy", "true");
      }
    }

    hideLoadingState() {
      // Always hide the initial loading overlay
      const initialLoading = document.getElementById("coveo-initial-loading");
      if (initialLoading) {
        initialLoading.style.display = "none";
      }

      // Remove loading class from results container
      if (this.resultsContainer) {
        this.resultsContainer.classList.remove("loading");
        this.resultsContainer.setAttribute("aria-busy", "false");
      }
    }

    buildSearchParams(query, page) {
      const sortBy = this.sortDropdown ? this.sortDropdown.value : "relevance";
      const { SearchParamsBuilder } = window.CoveoUtilsModule || {};
      const { CoveoConfig } = window.CoveoConfigModule || {};

      return SearchParamsBuilder.buildParams(
        query,
        page,
        sortBy,
        CoveoConfig.resultsPerPage,
        this.selectedFacets,
      );
    }

    async executeSearch(params) {
      const { CoveoConfig } = window.CoveoConfigModule || {};
      const response = await fetch(`${CoveoConfig.searchUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CoveoConfig.apiToken}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status}`);
      }

      return await response.json();
    }

    handleSearchResponse(data) {
      if (!data.results) {
        throw new Error("Invalid search response: no results found");
      }

      // Store the latest search response for later use
      window.lastSearchResponse = data;

      // Get query and total result count
      const query = this.getCurrentQuery();
      const totalCount = data.totalCount || 0;
      
      // Update page title
      const titleText = `Search: ${totalCount} results found for "${query}"`;
      document.title = titleText;
      console.log('Setting title to:', document.title);
      
      // Only update title-related social media tags
      this.updateTitleTags(titleText);
      
      // Process search results...
      if (data.results.length === 0) {
        const searchResultsSection = document.querySelector(".coveo-search-results-section");
        if (searchResultsSection) {
          searchResultsSection.innerHTML = `
            <div class="coveo-no-results-page">
              <p class="twcss-mt-20 twcss-text-center">No products found for "${query}". Check the spelling or use a different word or phrase.</p>
            </div>
          `;
        }
        return;
      }

      // Render results normally
      this.renderResults(data.results);

      if (data.totalCount !== undefined) {
        this.updatePagination(data.totalCount);
      }

      // Process facets
      if (data.facets) {
        const sortedFacets = (data?.facets || [])?.sort((a, b) => {
          if (a.facetId === "availablelocations") return -1;
          if (b.facetId === "availablelocations") return 1;
          return 0;
        });

        this.renderFacets(sortedFacets);
        this.renderSelectedFilters();
      }

      // Update structured data with correct title format
      this.updateStructuredData(data.results, query, totalCount);
      
      // Dispatch search complete event
      const searchCompleteEvent = new CustomEvent('coveo:search:complete', {
        detail: {
          query: query,
          totalResults: totalCount,
          results: data.results || []
        }
      });
      document.dispatchEvent(searchCompleteEvent);
    }

    handleSearchError(error) {
      console.error("Search request failed:", error);
      this.renderError();
    }

    renderError() {
      if (this.resultsContainer) {
        this.resultsContainer.innerHTML = `
          <div class="coveo-error-message">
            Sorry, there was an error loading the search results. Please try again.
          </div>
        `;
      }
    }

    updatePagination(totalCount) {
      // Get pagination template
      const paginationTemplate = document.getElementById(
        "coveoPaginationTemplate",
      );
      if (!paginationTemplate || !this.paginationContainer) {
        return;
      }

      // Clear previous pagination
      this.paginationContainer.innerHTML = "";

      // Clone template
      const clone = paginationTemplate.content.cloneNode(true);

      // Calculate pagination values
      const { CoveoConfig } = window.CoveoConfigModule || {};
      const perPage = CoveoConfig.resultsPerPage;
      const totalPages = Math.ceil(totalCount / perPage);
      const startIndex = (this.currentPage - 1) * perPage + 1;
      const endIndex = Math.min(this.currentPage * perPage, totalCount);

      // Update text elements
      clone.querySelector(".coveo-pagination-range").textContent =
        `${startIndex}-${endIndex}`;
      clone.querySelector(".coveo-pagination-total").textContent = totalCount;
      clone.querySelector(".coveo-current-page").textContent = this.currentPage;
      clone.querySelector(".coveo-total-pages").textContent = totalPages;

      // Set button states
      const prevButton = clone.querySelector(".coveo-pagination-prev");
      const nextButton = clone.querySelector(".coveo-pagination-next");

      prevButton.disabled = this.currentPage <= 1;
      nextButton.disabled = this.currentPage >= totalPages;

      // Add event listeners
      prevButton.addEventListener("click", () => {
        if (this.currentPage > 1) {
          this.performSearch(this.getCurrentQuery(), this.currentPage - 1);
        }
      });

      nextButton.addEventListener("click", () => {
        if (this.currentPage < totalPages) {
          this.performSearch(this.getCurrentQuery(), this.currentPage + 1);
        }
      });

      // Append pagination to container
      this.paginationContainer.appendChild(clone);

      // Update the result count display
      if (this.resultCountElement) {
        this.resultCountElement.textContent = `${totalCount} results`;
      }

      if (this.facetSidebarMobileFiltersCount) {
        this.facetSidebarMobileFiltersCount.textContent = `${totalCount}`;
      }

      // Update pagination meta tags for SEO
      this.updatePaginationMetaTags(this.currentPage, totalPages);
    }

    // Extract the tag rendering logic into a common method
    renderSelectedFilterTags(containerElement) {
      if (!containerElement) return;

      // Clear previous selected filters
      containerElement.innerHTML = "";

      // Check if there are no selected filters
      if (Object.keys(this.selectedFacets).length === 0) {
        return;
      }

      // Create fragment to hold all filters
      const fragment = document.createDocumentFragment();

      const { CoveoConfig, locationMap } = window.CoveoConfigModule || {};
      const { FacetUtils } = window.CoveoUtilsModule || {};

      // Loop through each selected facet
      Object.entries(this.selectedFacets).forEach(([facetId, values]) => {
        if (!values || values.length === 0) return;

        // Get the facet definition to use for display
        const facetDef = CoveoConfig.facets.find((f) => f.facetId === facetId);
        if (!facetDef) return;

        // Format the facet field name for display
        const facetTitle = FacetUtils.formatFacetTitle(facetDef.field);

        // Handle different facet types
        if (facetDef.type === "numericalRange") {
          // For numerical range facets, create a tag for each range
          values.forEach((range) => {
            const filterTag = this.createFilterTag(
              facetTitle,
              FacetUtils.formatPriceRange(
                range.start,
                range.end,
                range.endInclusive,
              ),
              () =>
                this.handleFacetSelect(facetId, range, false, "numericalRange"),
            );
            fragment.appendChild(filterTag);
          });
        } else {
          // For regular facets, create a tag for each value
          values.forEach((value) => {
            // Map location IDs to their friendly names for availablelocations facet
            let displayValue = value;
            if (facetId === "availablelocations" && locationMap) {
              const locationMapping = locationMap.find(
                (loc) => loc.value === value,
              );
              if (locationMapping) {
                displayValue = locationMapping.label;
              }
            }

            const filterTag = this.createFilterTag(
              facetTitle,
              displayValue,
              () => this.handleFacetSelect(facetId, value, false, "specific"),
            );
            fragment.appendChild(filterTag);
          });
        }
      });

      // Append all filter tags to the container
      containerElement.appendChild(fragment);
    }

    // Update the original renderSelectedFilters method to put mobile tags in the correct location
    renderSelectedFilters() {
      // Render desktop filter tags
      const selectedFiltersContainer = document.getElementById(
        "coveoSelectedFilters",
      );
      if (selectedFiltersContainer) {
        this.renderSelectedFilterTags(selectedFiltersContainer);
      }

      // Render mobile filter tags - but outside the modal, after the mobile sidebar element
      const facetSidebarMobile = document.querySelector(
        ".coveo-facet-sidebar-mobile",
      );
      if (facetSidebarMobile) {
        // Look for an existing mobile tags container
        let mobileTagsContainer = document.querySelector(
          ".coveo-mobile-selected-filters-container",
        );

        // Create it if it doesn't exist
        if (!mobileTagsContainer) {
          mobileTagsContainer = document.createElement("div");
          mobileTagsContainer.className =
            "coveo-mobile-selected-filters-container";

          // Insert after the mobile sidebar
          facetSidebarMobile.insertAdjacentElement(
            "afterend",
            mobileTagsContainer,
          );
        }

        // Render the tags
        this.renderSelectedFilterTags(mobileTagsContainer);

        // Add a class to indicate if there are filters selected
        if (Object.keys(this.selectedFacets).length > 0) {
          mobileTagsContainer.classList.add("has-filters");
        } else {
          mobileTagsContainer.classList.remove("has-filters");
        }

        // Ensure mobile tags container visibility respects the current view mode
        this.updateMobileVisibility();
      }

      // Update the visibility of the Clear All button
      this.updateClearAllButtonVisibility();
    }

    createFilterTag(label, value, onRemoveClick) {
      // Get the template
      const filterTagTemplate = document.getElementById(
        "coveoFilterTagTemplate",
      );
      if (!filterTagTemplate) {
        console.error("Filter tag template not found");
        return document.createElement("div"); // Return empty div as fallback
      }

      // Clone the template
      const filterTag = filterTagTemplate.content
        .cloneNode(true)
        .querySelector(".coveo-selected-filter");

      // Set the content
      const labelElement = filterTag.querySelector(
        ".coveo-selected-filter-label",
      );
      const valueElement = filterTag.querySelector(
        ".coveo-selected-filter-value",
      );
      const removeButton = filterTag.querySelector(
        ".coveo-selected-filter-remove",
      );

      // Fill in the data
      labelElement.textContent = `${label}: `;
      valueElement.textContent = value;
      removeButton.setAttribute(
        "aria-label",
        `Remove filter ${label}: ${value}`,
      );

      // Add event listener
      removeButton.addEventListener("click", onRemoveClick);

      return filterTag;
    }

    // Update the mobile visibility method to include the mobile tags container
    updateMobileVisibility() {
      const isMobileView = window.innerWidth < 750;

      // Update mobile filters visibility
      if (this.facetSidebarMobileFilters) {
        this.facetSidebarMobileFilters.style.display = isMobileView
          ? "flex"
          : "none";
      }

      // Update mobile selected filters container visibility
      const mobileTagsContainer = document.querySelector(
        ".coveo-mobile-selected-filters-container",
      );
      if (mobileTagsContainer) {
        mobileTagsContainer.style.display = isMobileView ? "flex" : "none";
      }

      // If we're in desktop view and the mobile modal is open, close it
      if (
        !isMobileView &&
        this.facetSidebarMobileModal &&
        this.facetSidebarMobileModal.classList.contains("active")
      ) {
        this.facetSidebarMobileModal.classList.remove("active");
        document.body.classList.remove("modal-open");
        this.isMobileSelectionActive = false;
      }
    }

    // Add new method for initializing view mode
    initializeViewMode() {
      // Get view buttons
      this.viewButtons = document.querySelectorAll(".view-button");
      if (!this.viewButtons || this.viewButtons.length === 0) {
        console.error("View mode buttons not found");
        return;
      }

      // Get the default view mode from session storage or use grid as fallback
      const savedViewMode =
        sessionStorage.getItem("collection-view-mode") || "grid";
      this.setViewMode(savedViewMode);

      // Add click event listeners to view mode buttons
      this.viewButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const viewMode = button.getAttribute("data-view");
          this.setViewMode(viewMode);
        });
      });
    }

    // Method to set the view mode
    setViewMode(viewMode) {
      if (!this.resultsContainer) return;

      // Save to session storage
      sessionStorage.setItem("collection-view-mode", viewMode);

      // Update the results container class
      if (viewMode === "list") {
        this.resultsContainer.classList.add("coveo-results-list-view");
        this.resultsContainer.classList.remove("coveo-results-grid-view");
      } else {
        this.resultsContainer.classList.add("coveo-results-grid-view");
        this.resultsContainer.classList.remove("coveo-results-list-view");
      }

      // Update active state of view buttons
      this.viewButtons.forEach((button) => {
        if (button.getAttribute("data-view") === viewMode) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      });
    }

    // New method to load facets from URL
    loadFacetsFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      const facetsParam = urlParams.get("facets");

      if (facetsParam) {
        try {
          // Decode and parse the facets from the URL
          const decodedFacets = decodeURIComponent(facetsParam);
          this.selectedFacets = JSON.parse(decodedFacets);
        } catch (error) {
          console.error("Error parsing facets from URL:", error);
          this.selectedFacets = {};
        }
      } else {
        this.selectedFacets = {};
      }
    }

    // New method to save facets to URL
    saveFacetsToUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get("q") || "";

      // Create a new URL with the current parameters
      const newUrl = new URL(window.location.href);
      const newParams = new URLSearchParams(newUrl.search);

      // Set the query parameter
      if (query) {
        newParams.set("q", query);
      } else {
        newParams.delete("q");
      }

      // Create SEO-friendly facet parameters
      if (Object.keys(this.selectedFacets).length > 0) {
        // First, store the complete facets data for app use
        const facetsJson = JSON.stringify(this.selectedFacets);
        newParams.set("facets", encodeURIComponent(facetsJson));
        
        // Now add SEO-friendly parameters for each facet
        Object.entries(this.selectedFacets).forEach(([facetId, values]) => {
          if (!values || values.length === 0) return;
          
          // Format facet ID for URL
          const urlParamName = facetId.replace(/[^a-zA-Z0-9]/g, '_');
          
          if (Array.isArray(values)) {
            // Handle regular facets with string values
            if (typeof values[0] === 'string') {
              newParams.set(urlParamName, values.join(','));
            } 
            // Handle range facets
            else if (values[0]?.start !== undefined) {
              const ranges = values.map(range => `${range.start}-${range.end || 'max'}`);
              newParams.set(`${urlParamName}_range`, ranges.join(','));
            }
          }
        });
      } else {
        // Clean up all facet parameters
        newParams.delete("facets");
        
        // Get all parameter names
        const paramNames = [];
        for (const key of newParams.keys()) {
          paramNames.push(key);
        }
        
        // Remove facet-specific parameters
        paramNames.forEach(param => {
          if (param !== 'q' && param !== 'page') {
            newParams.delete(param);
          }
        });
      }

      // Update the URL without refreshing the page
      newUrl.search = newParams.toString();
      window.history.replaceState({}, "", newUrl.toString());
    }

    // Add this method to the CoveoSearchResults class
    updateStructuredData(results, query, totalCount) {
      // Find existing structured data script or create new one
      let scriptElement = document.querySelector('script[type="application/ld+json"]');
      
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      
      // Create the search results structured data
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "SearchResultsPage",
        "name": `Search: ${totalCount} results found for "${query}"`,
        "description": `Browse ${totalCount} products matching "${query}"`,
        "mainEntity": {
          "@type": "ItemList",
          "itemListElement": []
        }
      };
      
      // Add results to structured data
      if (results && results.length > 0) {
        results.forEach((result, index) => {
          const product = result.raw;
          const productUrl = product?.ec_pdp_url ? `/products/${product.ec_pdp_url}` : "";
          const imageUrl = Array.isArray(product?.ec_images) ? product.ec_images[0] : product?.ec_images;
          
          structuredData.mainEntity.itemListElement.push({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
              "@type": "Product",
              "name": product?.ec_name || product?.ec_product_name || "",
              "url": `${window.location.origin}${productUrl}`,
              "image": imageUrl,
              "brand": {
                "@type": "Brand",
                "name": product?.ec_brand || ""
              },
              "offers": {
                "@type": "Offer",
                "price": product?.ec_price_dict || product?.ec_price || "",
                "priceCurrency": "USD"
              },
              "sku": product?.ec_sku || ""
            }
          });
        });
      }
      
      // Update the script content
      scriptElement.textContent = JSON.stringify(structuredData);
    }

    // Add this method to manage pagination meta tags
    updatePaginationMetaTags(currentPage, totalPages) {
      // Remove any existing pagination meta tags
      const existingMetaTags = document.querySelectorAll('meta[name="robots"][content*="noindex"]');
      existingMetaTags.forEach(tag => tag.remove());
      
      // Create base URL for pagination links
      const baseUrl = new URL(window.location.href);
      const params = new URLSearchParams(baseUrl.search);
      
      // Remove existing page parameter
      params.delete('page');
      baseUrl.search = params.toString();
      
      // Helper to add page parameter
      const getPageUrl = (pageNum) => {
        const pageUrl = new URL(baseUrl);
        const pageParams = new URLSearchParams(pageUrl.search);
        if (pageNum > 1) {
          pageParams.set('page', pageNum.toString());
        }
        pageUrl.search = pageParams.toString();
        return pageUrl.toString();
      };
      
      // Current URL
      const currentUrl = getPageUrl(currentPage);
      
      // Set canonical URL to current page
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', currentUrl);
      
      // Add next/prev links for pagination
      // Remove existing next/prev links
      document.querySelectorAll('link[rel="next"], link[rel="prev"]').forEach(link => link.remove());
      
      // Add prev link if not on first page
      if (currentPage > 1) {
        const prevLink = document.createElement('link');
        prevLink.setAttribute('rel', 'prev');
        prevLink.setAttribute('href', getPageUrl(currentPage - 1));
        document.head.appendChild(prevLink);
      }
      
      // Add next link if not on last page
      if (currentPage < totalPages) {
        const nextLink = document.createElement('link');
        nextLink.setAttribute('rel', 'next');
        nextLink.setAttribute('href', getPageUrl(currentPage + 1));
        document.head.appendChild(nextLink);
      }
    }

    // Update result count method
    updateResultCount(totalCount) {
      // Update display
      if (this.resultCountElement) {
        this.resultCountElement.textContent = `${totalCount} results`;
      }
      
      // Update title and related tags
      const query = this.getCurrentQuery();
      const titleText = `Search: ${totalCount} results found for "${query}"`;
      document.title = titleText;
      
      // Update title-related tags
      this.updateTitleTags(titleText);
    }

    // Replace original updateSocialMediaTags method, only update title
    updateTitleTags(titleText) {
      // Update Open Graph title
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute('content', titleText);
      
      // Update Twitter title
      let twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (!twitterTitle) {
        twitterTitle = document.createElement('meta');
        twitterTitle.setAttribute('name', 'twitter:title');
        document.head.appendChild(twitterTitle);
      }
      twitterTitle.setAttribute('content', titleText);
    }
  }

  // Export the class to the global scope
  window.CoveoMainModule = { CoveoSearchResults };
})();
