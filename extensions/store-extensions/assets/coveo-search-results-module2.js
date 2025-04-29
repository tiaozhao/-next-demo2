// FacetUtils and SearchParamsBuilder
// Import from module1
const { CoveoConfig, labelMap } = window.CoveoConfigModule || {};

// Initialize the module namespace
window.CoveoUtilsModule = window.CoveoUtilsModule || {};

// Define utilities as properties of the namespace
window.CoveoUtilsModule.FacetUtils = {
  prepareFacetsForSearch(facetDefinitions, selectedFacets) {
    return facetDefinitions.map((facet) => {
      const facetConfig = { ...facet };
      if (selectedFacets[facet.facetId]) {
        if (facet.type === 'numericalRange') {
          facetConfig.currentValues = selectedFacets[facet.facetId].map((range) => ({
            ...range,
            state: 'selected',
          }));
        } else {
          facetConfig.currentValues = selectedFacets[facet.facetId].map((value) => ({
            value,
            state: 'selected',
          }));
        }
      }
      return facetConfig;
    });
  },

  formatFacetTitle(fieldName) {
    return (
      labelMap[fieldName] ||
      fieldName
        .replace(/^ec_/, '')
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
    );
  },

  updateFacetSelection(selectedFacets, facetId, value, isSelected, facetType) {
    const updatedFacets = { ...selectedFacets };
    if (!updatedFacets[facetId]) {
      updatedFacets[facetId] = [];
    }

    if (isSelected) {
      if (facetType === 'numericalRange') {
        const rangeExists = updatedFacets[facetId].some((range) => range.start === value.start && range.end === value.end);
        if (!rangeExists) {
          updatedFacets[facetId] = [...updatedFacets[facetId], value];
        }
      } else {
        if (!updatedFacets[facetId].includes(value)) {
          updatedFacets[facetId] = [...updatedFacets[facetId], value];
        }
      }
    } else {
      if (facetType === 'numericalRange') {
        updatedFacets[facetId] = updatedFacets[facetId].filter((range) => !(range.start === value.start && range.end === value.end));
      } else {
        updatedFacets[facetId] = updatedFacets[facetId].filter((v) => v !== value);
      }
      if (updatedFacets[facetId].length === 0) {
        delete updatedFacets[facetId];
      }
    }
    return updatedFacets;
  },

  formatPriceRange(start, end, endInclusive) {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (end === undefined || end === null) {
      return `${formatter.format(start)} and above`;
    }
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  },

  getRangeId(range) {
    return `range-${range.start}-${range.end}`;
  },
};

window.CoveoUtilsModule.SearchParamsBuilder = {
  buildParams(query, page, sortBy, resultsPerPage, selectedFacets) {
    const sortCriteria = this.getSortCriteria(sortBy);
    const catalogs = JSON.parse(localStorage.getItem('catalogs'));
    const currentCatalogId = catalogs?.[0]?.id?.replace('gid://shopify/CompanyLocationCatalog/', '');
    const companyId = localStorage.getItem('company-id');

    return {
      q: query,
      debug: false,
      searchHub: 'AdminConsole',
      pipeline: 'Search',
      locale: 'en-US',
      enableDidYouMean: true,
      enableQuerySyntax: false,
      tab: 'default',
      numberOfResults: resultsPerPage,
      firstResult: (page - 1) * resultsPerPage,
      sortCriteria,
      dictionaryFieldContext: {
        ec_price_dict: currentCatalogId,
        ec_customer_part_number_dict: companyId,
      },
      facets: window.CoveoUtilsModule.FacetUtils.prepareFacetsForSearch(CoveoConfig.facets, selectedFacets),
      filterField: 'ec_product_id',
      // aq: '@objecttype==Product',
      // aq: "($qre(expression:'@objecttype==Product', modifier:'500')) ($qre(expression:'@objecttype==Product', modifier:'500'))",
      // cq: '(@source==("RDS Dev Push")) (@objecttype==(Product,Variant)) (@source==("RDS Dev Push")) (@objecttype==(Product,Variant))',
      // dq: `(@objecttype==Product [[@ec_product_id] (@objecttype==Variant) (${query})]) (@objecttype==Product [[@ec_product_id] (@objecttype==Variant) (${query}) ($qre(expression:'@objecttype==Product', modifier:'500'))])`,
    };
  },

  getSortCriteria(sortBy) {
    switch (sortBy) {
      case 'price-asc':
        return 'ec_price ascending';
      case 'price-desc':
        return 'ec_price descending';
      case 'name-asc':
        return 'ec_name ascending';
      case 'name-desc':
        return 'ec_name descending';
      default:
        return 'relevancy';
    }
  },
};

window.CoveoUtilsModule.addToCartAndUpdateUI = async function(products) {
  await fetch(`${window.Shopify.routes.root}cart/add.js`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: products,
      sections: 'cart-drawer,cart-icon-bubble',
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      const sections = ['cart-icon-bubble', 'cart-drawer'];
      sections.forEach((section) => {
        const sectionHtml = new DOMParser().parseFromString(data.sections[section], 'text/html');
        if (sectionHtml) {
          if (section === 'cart-drawer') {
            document.querySelector(`#CartDrawer`).innerHTML = sectionHtml.querySelector(`#CartDrawer`).innerHTML;
          } else {
            document.querySelector(`#${section}`).innerHTML = sectionHtml.querySelector(`#shopify-section-${section}`).innerHTML;
          }
        }
      });

      // eslint-disable-next-line no-undef
      createToast('Product added to cart', '', 'success');
    })
    .catch((error) => {
      // eslint-disable-next-line no-undef
      createToast(error.message, '', 'error');
    });
};

window.CoveoUtilsModule.addToList = function(product) {
  const selectedProducts = {
    productId: `gid://shopify/Product/${product?.ec_product_id}`,
    productVariantId: `gid://shopify/ProductVariant/${product?.ec_variant_id}`,
    url: `${window.Shopify.routes.root}products/${product?.ec_pdp_url}`,
    quantity: 1,
  };

  window.shoppingListModal.selectedProducts = [selectedProducts];
  window.shoppingListModal.open();
};
