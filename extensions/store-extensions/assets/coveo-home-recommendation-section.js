(() => {
  document.addEventListener('DOMContentLoaded', async function () {
    const coveoConfig = {
      ...window?.CoveoSearch?.config,
      pipeline: 'Recommendations',
      recommendation: 'popularViewed',
      searchHub: 'Home',
    }

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    window.CoveoUtilsModule = undefined;
    const { module2 } = window.coveoModulePaths || {};
    await loadScript(module2);

    const loadingElement = document.getElementById('featured-products-loading');
    const errorElement = document.getElementById('featured-products-error');
    const sliderElement = document.getElementById('coveo-home');
    const sliderWrapper = sliderElement.querySelector('.swiper-wrapper');
    const sliderPrevButtonElement = document.querySelector('.coveo-rec-container .swiper-button-prev')
    const sliderNextButtonElement = document.querySelector('.coveo-rec-container .swiper-button-next')
    const productTemplate = document.getElementById('product-card-template');

    // Function to fetch recommendations from Coveo
    async function fetchRecommendations() {
      try {
        // Create a visitor ID or use an existing one
        const visitorId = localStorage.getItem('visitorId') || '';
        const { orgId, apiToken, ...restConfig } = coveoConfig;

        const response = await fetch(coveoConfig?.searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${coveoConfig?.apiToken}`,
          },
          body: JSON.stringify({
            ...restConfig,
            locale: 'en-US',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            visitorId,
            numberOfResults: 10,
            context: {
              website: 'b2b-accelerator',
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }

        const data = await response.json();
        
        return data.results || [];
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        throw error;
      }
    }

    function formatPrice(price) {
      if (!price && price !== 0) return '';
      
      // If it's already a formatted string with currency symbol, return as is
      if (typeof price === 'string' && /^[\$£€¥]/.test(price)) {
        return price;
      }
      
      // Convert to number if it's a string containing a number
      let numPrice = price;
      if (typeof price === 'string') {
        numPrice = parseFloat(price.replace(/[^\d.-]/g, ''));
        if (isNaN(numPrice)) return '$0.00';
      }
      
      // Format with 2 decimal places and thousands separator
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(numPrice);
    }

    // Function to render recommendations to the slider
    function renderRecommendations(recommendations) {
      if (!recommendations || recommendations.length === 0) {
        errorElement.classList.remove('coveo-rec-hidden');
        errorElement.classList.add('coveo-rec-visible');
        errorElement.textContent = 'No recommendations';
        sliderPrevButtonElement.style.display = 'none';
        sliderNextButtonElement.style.display = 'none';
        return;
      }

      // Clear existing slides if any
      sliderWrapper.innerHTML = '';

      // Create slides for each recommendation
      recommendations.forEach((recommendation) => {
        // Clone the template
        const productCard = productTemplate.content.cloneNode(true);
        
        // Access product information from recommendation
        const title = recommendation.title || recommendation.raw?.ec_product_name || 'Product';
        const brand = recommendation.raw?.ec_brand || '';
        const listPrice = recommendation.raw?.ec_price_dict || '';
        const price = recommendation.raw?.ec_price || '';
        const partnerNumber = recommendation.raw?.ec_customer_part_number_dict || '';
        const sku = recommendation.raw?.ec_sku || '';
        const imageUrl = recommendation.raw?.ec_images && recommendation.raw.ec_images.length > 0 
          ? recommendation.raw.ec_images[0] 
          : '';
        
        // Set links
        const imgContainer = productCard.querySelector('.coveo-rec-product-image-container');
        imgContainer.href = `/products/${recommendation.raw?.ec_pdp_url}` || '#';
        
        // Set brand if available
        const brandElement = productCard.querySelector('.coveo-rec-product-brand');
        if (brand) {
          brandElement.textContent = brand;
        } else {
          brandElement.style.display = 'none';
        }
        
        // Set title
        const productNameLink = productCard.querySelector('.coveo-rec-product-name a');
        productNameLink.textContent = title;
        productNameLink.href = `/products/${recommendation.raw?.ec_pdp_url}` || '#';
        
        // Set pricing
        const listPriceElement = productCard.querySelector('.coveo-rec-product-list-price');
        const priceElement = productCard.querySelector('.coveo-rec-product-price');
        
        if (listPrice) {
          listPriceElement.textContent = formatPrice(listPrice);
        } else {
          listPriceElement.style.display = 'none';
        }
        
        if (price) {
          priceElement.textContent = formatPrice(price);
        } else {
          priceElement.style.display = 'none';
        }
        
        // Set product info
        const partnerNumberElement = productCard.querySelector('.coveo-rec-product-partner-number');
        const skuElement = productCard.querySelector('.coveo-rec-product-sku');
        
        if (partnerNumber) {
          partnerNumberElement.textContent = partnerNumber;
        } else {
          partnerNumberElement.style.display = 'none';
        }
        
        if (sku) {
          skuElement.textContent = sku;
        } else {
          skuElement.style.display = 'none';
        }
        
        // Set image
        const productImage = productCard.querySelector('.coveo-rec-product-image');
        
        if (imageUrl) {
          productImage.src = imageUrl;
          productImage.alt = title;
        } else {
          productImage.style.display = 'none';
          imgContainer.textContent = 'No image available';
          imgContainer.style.display = 'flex';
          imgContainer.style.alignItems = 'center';
          imgContainer.style.justifyContent = 'center';
        }
        
        // Add button event listeners
        const addToCartButton = productCard.querySelector('.coveo-rec-btn-add-to-cart');
        const addToListButton = productCard.querySelector('.coveo-rec-btn-add-to-list');
        const { addToCartAndUpdateUI, addToList } = window.CoveoUtilsModule || {};
        
        if (addToCartButton && recommendation.raw?.ec_availabilities === 0) {
          addToCartButton.textContent = "Sold out";
          addToCartButton.classList.add("coveo-rec-btn-disabled");
        } else {
          addToCartButton.textContent = "Add to Cart";

          addToCartButton.addEventListener('click', function(e) {
            e.preventDefault();
            addToCartAndUpdateUI([{
              id: recommendation.raw?.ec_variant_id,
              quantity: 1,
            }]);
          });
        }
        
        addToListButton.addEventListener('click', function(e) {
          e.preventDefault();
          addToList(recommendation.raw)
        });
        
        // Add the product card to the slider
        sliderWrapper.appendChild(productCard);
      });

      // Hide loading element if it's still visible
      loadingElement.classList.add('coveo-rec-hidden');
      
      // Show the slider
      sliderElement.style.display = 'block';

      // Check if Swiper is available in the window object
      if (window.Swiper) {
        try {
          new window.Swiper('#coveo-home', {
            slidesPerView: 4,
            spaceBetween: 20,
            navigation: {
              nextEl: '.swiper-button-next',
              prevEl: '.swiper-button-prev',
            },
            breakpoints: {
              320: {
                slidesPerView: 1,
                spaceBetween: 10,
              },
              768: {
                slidesPerView: 3,
                spaceBetween: 15,
              },
              1024: {
                slidesPerView: 4,
                spaceBetween: 20,
              }
            },
            on: {
              init: function() {
                console.log('Swiper initialized successfully');
              }
            }
          });
        } catch (error) {
          console.error('Error initializing Swiper:', error);
        }
      } else {
        console.warn('Swiper not available, using fallback display');
      }
    }

    // Fetch and render recommendations
    fetchRecommendations()
      .then((recommendations) => {
        // Ensure loading element is hidden
        loadingElement.classList.add('coveo-rec-hidden');
        
        renderRecommendations(recommendations);
      })
      .catch((error) => {
        // Ensure loading element is hidden
        loadingElement.classList.add('coveo-rec-hidden');
        
        // Show error element
        errorElement.classList.remove('coveo-rec-hidden');
        errorElement.classList.add('coveo-rec-visible');
        console.error('Error:', error);
      });
  });
})()