// Initialize the module namespace
window.CoveoRenderersModule = window.CoveoRenderersModule || {};

// Access FacetUtils from the utils module
const { addToCartAndUpdateUI, addToList } = window.CoveoUtilsModule || {};

// Define your renderers as properties of the namespace instead of using const
window.CoveoRenderersModule.ResultRenderer = class ResultRenderer {
  constructor(template, locale) {
    this.template = template;
    this.locale = locale;
  }

  renderResult(result) {
    const clone = this.template.content.cloneNode(true);
    const productData = result.raw;

    this.renderLinks(clone, productData);
    this.renderImage(clone, productData);
    this.renderBrand(clone, productData);
    this.renderTitle(clone, productData);
    this.renderPricing(clone, productData);
    this.renderDetails(clone, productData);
    this.renderCompare(clone, productData);
    this.setupActions(clone, productData, result);

    return clone;
  }

  renderLinks(element, resultData) {
    const links = element.querySelectorAll(".coveo-result-link");
    const pdpUrl = resultData?.ec_pdp_url;
    const productUrl = pdpUrl ? `/products/${pdpUrl}` : "";
    links.forEach((link) => {
      link.href = productUrl;
    });
  }

  renderImage(element, resultData) {
    const img = element.querySelector(".coveo-result-image img");
    const imageData = resultData?.ec_images;
    if (img) {
      if (Array.isArray(imageData)) {
        img.src = imageData[0] || "";
      } else {
        img.src = imageData || "";
      }
      img.alt = resultData?.ec_name || "";
    }
  }

  renderBrand(element, data) {
    const brandElement = element.querySelector(".coveo-result-brand");
    if (brandElement) {
      brandElement.textContent = data.ec_brand || "";
    }
  }

  renderTitle(element, result) {
    const titleElement = element.querySelector(".coveo-result-title a");
    if (titleElement) {
      titleElement.textContent = result?.ec_product_name || "";
    }
  }

  renderPricing(element, data) {
    const formatter = new Intl.NumberFormat(this.locale, {
      style: "currency",
      currency: "USD",
    });

    const listPriceElement = element.querySelector(".coveo-list-price-value");
    if (listPriceElement) {
      const listPrice = data.ec_price || 0;
      listPriceElement.textContent = listPrice
        ? formatter.format(listPrice)
        : "";
    }

    const yourPriceElement = element.querySelector(".coveo-your-price-value");
    if (yourPriceElement) {
      const price = data.ec_price_dict || 0;
      yourPriceElement.textContent = price ? formatter.format(price) : "";
    }
  }

  renderDetails(element, data) {
    const partNumberElement = element.querySelector(
      ".coveo-partner-number-value",
    );
    if (partNumberElement) {
      partNumberElement.textContent = data.ec_customer_part_number_dict || "";
    }

    const skuElement = element.querySelector(".coveo-sku-value");
    if (skuElement) {
      skuElement.textContent = data.ec_sku || "";
    }
  }

  renderCompare(element, resultData) {
    const compareCheckbox = element.querySelector(".compare-checkbox");
    if (compareCheckbox) {
      const uniqueId = resultData?.ec_product_id || "";
      compareCheckbox.value = uniqueId;
      compareCheckbox.dataset.productTitle = resultData?.ec_name || "";
      compareCheckbox.dataset.productUrl = resultData?.ec_url || "";
      compareCheckbox.dataset.productImage = resultData?.ec_images?.[0] || "";
      
      // Check localStorage for pre-selected compare products
      try {
        const compareProducts = localStorage.getItem('compare-product-ids');
        if (compareProducts) {
          const parsedProducts = JSON.parse(compareProducts);
          // Check if this product is in the compare list
          const isInCompare = parsedProducts.some(item => item[0] === uniqueId);
          const compareCount = parsedProducts.length;
          
          // Get the compare label
          const compareLabel = compareCheckbox.closest('.compare-label');
          
          if (isInCompare) {
            // Pre-select the checkbox
            compareCheckbox.checked = true;
            // Also update visual state of the custom checkbox
            if (compareLabel) {
              const customCheckbox = compareLabel.querySelector('.compare-checkbox-custom');
              if (customCheckbox) {
                customCheckbox.classList.add('checked');
              }
            }
          } else if (compareCount >= 4) {
            // If not already in compare and at limit, disable this checkbox
            compareCheckbox.disabled = true;
            if (compareLabel) {
              compareLabel.classList.add('compare-checkbox-disabled');
            }
          }
        }
      } catch (error) {
        console.error('Error parsing compare products from localStorage:', error);
      }
    }
  }

  setupActions(element, data, result) {
    const pdpUrl = data?.ec_pdp_url || result.raw?.ec_pdp_url;
    data["ec_pdp_url"] = pdpUrl;

    const addToCartButton = element.querySelector(".coveo-add-to-cart");

    if (addToCartButton && data?.ec_availabilities === 0) {
      addToCartButton.textContent = "Sold out";
      addToCartButton.classList.add("disabled");
    } else {
      addToCartButton.textContent = "Add to Cart";
      addToCartButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleAddToCart(data, addToCartButton);
      });
    }

    const addToListButton = element.querySelector(".coveo-add-to-list");
    if (addToListButton) {
      addToListButton.textContent = "Add to List";
      addToListButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleAddToList(data);
      });
    }
  }

  async handleAddToCart(product, button) {
    button.classList.add("loading");
    button.disabled = true;
    const loadingTemplate = document.getElementById("buttonLoadingTemplate");
    if (loadingTemplate) {
      button.innerHTML = "";
      button.appendChild(loadingTemplate.content.cloneNode(true));
    }

    try {
      const products = [
        {
          id: product?.ec_variant_id,
          quantity: 1,
        },
      ]
      addToCartAndUpdateUI(products);
    } finally {
      button.classList.remove("loading");
      button.disabled = false;
      button.textContent = "Add to Cart";
    }
  }

  handleAddToList(product) {
    addToList(product)
  }
};

window.CoveoRenderersModule.FacetRenderer = class FacetRenderer {
  constructor(facetTemplate, facetValueTemplate) {
    this.facetTemplate = facetTemplate;
    this.facetValueTemplate = facetValueTemplate;
    this.checkboxTemplate = document.getElementById("checkbox-template");
  }

  renderFacets(facets, selectedFacets, onFacetSelect, onShowMore) {
    const fragment = document.createDocumentFragment();

    facets.forEach((facet) => {
      if (!facet.values || facet.values.length === 0) return;
      const facetElement = this.renderFacet(
        facet,
        selectedFacets,
        onFacetSelect,
        onShowMore,
      );
      fragment.appendChild(facetElement);
    });

    return fragment;
  }

  renderFacet(facet, selectedFacets, onFacetSelect, onShowMore) {
    const clone = this.facetTemplate.content.cloneNode(true);
    const facetTitle = clone.querySelector(".coveo-facet-title");
    const facetValues = clone.querySelector(".coveo-facet-values");

    const labelText = window.CoveoUtilsModule.FacetUtils.formatFacetTitle(
      facet.field,
    );
    facetTitle.textContent = labelText;

    const facetElement = clone.querySelector(".coveo-facet");
    facetElement.dataset.facetId = facet.facetId;
    facetElement.dataset.facetType = facet.type;

    const toggleButton = clone.querySelector(".coveo-facet-toggle");
    const facetSidebar = clone.querySelector(".coveo-facet-header");
    toggleButton.addEventListener("click", () => {
      facetElement.classList.toggle("coveo-facet-collapsed");
      facetSidebar.classList.toggle("coveo-facet-header-close");
    });

    this.renderFacetValues(facetValues, facet, selectedFacets, onFacetSelect);

    if (facet.values && facet.values.length >= facet.numberOfValues) {
      this.addShowMoreButton(facetValues, facet, onShowMore);
    }

    return clone;
  }

  renderFacetValues(container, facet, selectedFacets, onFacetSelect) {
    container.innerHTML = "";

    if (!facet.values || facet.values.length === 0) {
      return;
    }

    if (facet?.values[0]?.start || facet?.values[0]?.end) {
      this.renderNumericalRanges(
        container,
        facet,
        selectedFacets,
        onFacetSelect,
      );
    } else {
      this.renderSpecificValues(
        container,
        facet,
        selectedFacets,
        onFacetSelect,
      );
    }
  }

  renderSpecificValues(container, facet, selectedFacets, onFacetSelect) {
    facet.values.forEach((facetValue) => {
      const valueName = facetValue.value;
      const valueCount = facetValue.numberOfResults;
      const isSelected = this.isValueSelected(
        facet.facetId,
        valueName,
        selectedFacets,
      );

      const valueElement = this.createFacetValueElement(
        valueName,
        valueCount,
        isSelected,
        () => onFacetSelect(facet.facetId, valueName, !isSelected, "specific"),
        facet.facetId,
      );

      container.appendChild(valueElement);
    });
  }

  renderNumericalRanges(container, facet, selectedFacets, onFacetSelect) {
    facet.values.forEach((range) => {
      const start = range.start;
      const end = range.end;
      const endInclusive = range.endInclusive;
      const count = range.numberOfResults;

      if (count === 0) return;

      const displayValue = window.CoveoUtilsModule.FacetUtils.formatPriceRange(
        start,
        end,
        endInclusive,
      );
      const isSelected = this.isRangeSelected(
        facet.facetId,
        start,
        end,
        selectedFacets,
      );

      const rangeElement = this.createFacetValueElement(
        displayValue,
        count,
        isSelected,
        () =>
          onFacetSelect(
            facet.facetId,
            { start, end, endInclusive },
            !isSelected,
            "numericalRange",
          ),
        facet.facetId,
      );

      container.appendChild(rangeElement);
    });
  }

  createFacetValueElement(value, count, isSelected, onClick, facetId) {
    const clone = this.facetValueTemplate.content.cloneNode(true);

    const nameElement = clone.querySelector(".coveo-facet-value-name");
    const countElement = clone.querySelector(".coveo-facet-value-count");
    const checkbox = clone.querySelector(".coveo-facet-checkbox");
    const checkboxContainer = clone.querySelector(".coveo-checkbox");

    // Apply location mapping for availablelocations facet
    if (facetId === "availablelocations") {
      const { locationMap } = window.CoveoConfigModule || {};
      if (locationMap) {
        // Try to find a mapped label for this value
        const mapping = locationMap.find((map) => map.value === value);
        if (mapping) {
          nameElement.textContent = mapping.label;
        } else {
          nameElement.textContent = value;
        }
      } else {
        nameElement.textContent = value;
      }
    } else {
      nameElement.textContent = value;
    }

    countElement.textContent = `(${count})`;
    checkbox.checked = isSelected;

    if (isSelected) {
      checkboxContainer.classList.add("checked");
    }

    if (this.checkboxTemplate) {
      const checkboxTemplateClone =
        this.checkboxTemplate.content.cloneNode(true);
      checkboxContainer.appendChild(checkboxTemplateClone);
    }

    const valueLabel = clone.querySelector(".coveo-facet-value-label");
    valueLabel.addEventListener("click", (event) => {
      event.preventDefault();
      onClick();

      checkbox.checked = !checkbox.checked;
      checkboxContainer.classList.toggle("checked");
    });

    return clone;
  }

  isValueSelected(facetId, value, selectedFacets) {
    return selectedFacets[facetId] && selectedFacets[facetId].includes(value);
  }

  isRangeSelected(facetId, start, end, selectedFacets) {
    if (!selectedFacets[facetId]) return false;
    return selectedFacets[facetId].some(
      (range) => range.start === start && range.end === end,
    );
  }

  addShowMoreButton(container, facet, onShowMore) {
    const facetId = facet.facetId;
    const facetState = onShowMore.facetState?.[facetId] || {};
    const isExpanded = facetState.isExpanded || false;

    const button = document.createElement("button");
    button.className = isExpanded
      ? "coveo-facet-show-less"
      : "coveo-facet-show-more";
    button.textContent = isExpanded ? "Show less" : "Show more";

    button.addEventListener("click", () => {
      onShowMore(facetId, facet.type, !isExpanded);
    });

    container.appendChild(button);
  }
};
