(() => {
  // Helper to load script dynamically
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  };

  // Function to hide loading
  const hideLoading = () => {
    const loadingOverlay = document.getElementById('coveo-initial-loading');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  };

  // Ensure loading is hidden after a timeout (failsafe)
  setTimeout(hideLoading, 10000); // 10 seconds maximum loading time

  // Load modules in sequence and initialize
  const init = async () => {
    try {
      // Clear any existing module references
      window.CoveoConfigModule = undefined;
      window.CoveoUtilsModule = undefined;
      window.CoveoRenderersModule = undefined;
      window.CoveoMainModule = undefined;

      // Get module paths from global variable set in Liquid
      const { module1, module2, module3, module4 } = window.coveoModulePaths || {};
      
      if (!module1 || !module2 || !module3 || !module4) {
        console.error('Coveo module paths not defined. Make sure the window.coveoModulePaths variable is set.');
        hideLoading();
        return;
      }
      
      await loadScript(module1);
      await loadScript(module2);
      await loadScript(module3);
      await loadScript(module4);

      // Hide loading before initializing
      hideLoading();

      // Initialize when all modules are loaded
      if (document.getElementById('MainContent') && window.CoveoMainModule) {
        const { CoveoSearchResults } = window.CoveoMainModule;
        new CoveoSearchResults();
      }
    } catch (error) {
      console.error('Failed to initialize Coveo Search Results:', error);
      hideLoading();
    }
  };

  // Start loading modules immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Add another failsafe - hide loading when window loads
  window.addEventListener('load', hideLoading);
})();
