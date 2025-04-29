// Configuration module
// Initialize the module namespace
window.CoveoConfigModule = window.CoveoConfigModule || {};

// Try to get the default catalog ID from localStorage
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

// Define CoveoConfig directly as a property of the module
window.CoveoConfigModule.CoveoConfig = {
  ...window?.CoveoSearch?.config,
  resultsPerPage: 12,
  facets: [
    {
      filterFacetCount: true,
      injectionDepth: 1000,
      numberOfValues: 8,
      sortCriteria: 'automatic',
      resultsMustMatch: 'atLeastOneValue',
      type: 'specific',
      currentValues: [],
      freezeCurrentValues: false,
      isFieldExpanded: false,
      preventAutoSelect: false,
      facetId: 'ec_category',
      field: 'ec_category',
      tabs: {
        included: [],
        excluded: [],
      },
      activeTab: '',
    },
    {
      filterFacetCount: true,
      injectionDepth: 1000,
      numberOfValues: 8,
      sortCriteria: 'automatic',
      resultsMustMatch: 'atLeastOneValue',
      type: 'specific',
      currentValues: [],
      freezeCurrentValues: false,
      isFieldExpanded: false,
      preventAutoSelect: false,
      facetId: 'ec_brand',
      field: 'ec_brand',
      tabs: {
        included: [],
        excluded: [],
      },
      activeTab: '',
    },
    {
      filterFacetCount: true,
      injectionDepth: 1000,
      numberOfValues: 8,
      sortCriteria: 'ascending',
      rangeAlgorithm: 'equiprobable',
      resultsMustMatch: 'atLeastOneValue',
      currentValues: [
        {
          start: 0,
          end: 10,
          endInclusive: false, // Range is [5..10) - includes 5, excludes 10
          state: 'idle', // Required state for definition
        },
        {
          start: 10,
          end: 20,
          endInclusive: false, // Range is [10..20)
          state: 'idle',
        },
        {
          start: 20,
          end: 50,
          endInclusive: false, // Range is [20..30)
          state: 'idle',
        },
        {
          start: 50,
          end: 10000,
          endInclusive: false, // Range is [20..30)
          state: 'idle',
        },
      ],
      preventAutoSelect: false,
      type: 'numericalRange',
      facetId: 'ec_price_dict',
      field: 'ec_price_dict',
      generateAutomaticRanges: false,
      tabs: {},
      activeTab: '',
    },
    {
      filterFacetCount: true,
      injectionDepth: 1000,
      numberOfValues: 8,
      sortCriteria: 'automatic',
      resultsMustMatch: 'atLeastOneValue',
      type: 'specific',
      currentValues: [],
      freezeCurrentValues: false,
      isFieldExpanded: false,
      preventAutoSelect: false,
      facetId: 'availablelocations',
      field: 'availablelocations',
      tabs: {
        included: [],
        excluded: [],
      },
      activeTab: '',
    },
    {
      filterFacetCount: true,
      injectionDepth: 1000,
      numberOfValues: 8,
      sortCriteria: 'automatic',
      resultsMustMatch: 'atLeastOneValue',
      type: 'specific',
      currentValues: defaultCatalogValue ? [defaultCatalogValue] : [],
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
};

// Label mappings for facets
window.CoveoConfigModule.labelMap = {
  ec_category: 'Category',
  ec_brand: 'Brand',
  ec_price_dict: 'Price',
  availablelocations: 'Locations',
  ec_catalog_id: 'Catalog ID',
};

// Define location mapping for availability
window.CoveoConfigModule.locationMap = [
  {
    label: 'Long Beach',
    value: '82936398044',
  },
  {
    label: 'My Custom Location Info',
    value: '80245457116',
  },
  {
    label: 'Shop location',
    value: '80245424348',
  },
];
