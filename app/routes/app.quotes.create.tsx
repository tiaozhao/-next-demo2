import type { LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import {
  AutoSelection,
  BlockStack,
  Box,
  Button,
  Card,
  Combobox,
  DataTable,
  DatePicker,
  Frame,
  Grid,
  Icon,
  InlineError,
  InlineStack,
  Listbox,
  Loading,
  Page,
  Popover,
  Text,
  TextField,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import _ from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import ChangeLanguageSelector from '~/components/admin-portal/ChangeLanguageSelctor';
import { CustomerAutocomplete } from '~/components/admin-portal/CustomerAutocomplete';
import { QUERY_ADMIN_PORTAL_QUOTES_LIST } from '~/constant/react-query-keys';
import { useCustomerPartnerNumberBySkuMutation, useGetProductVariantsByApi } from '~/hooks/use-product-search';
import { useCreateQuote, useQuoteCreateWithQuoteId } from '~/hooks/use-quotes';
import { authenticate } from '~/shopify.server';

interface CustomerInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface LocationInfo {
  companyId: string;
  companyName: string;
  locationId: string;
  locationName: string;
}

interface SelectedInfo {
  customer: CustomerInfo | null;
  location: LocationInfo | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export default function QuoteCreate() {
  const { shop: storeName } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const resubmitQuoteId = searchParams.get('resubmitQuoteId');
  const resubmitCustomerId = searchParams.get('customerId');
  const resubmitCompanyLocationId = searchParams.get('companyLocationId');

  const [notes, setNotes] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
  const [products, setProducts] = useState([{ id: 1, product: '', qty: '0', uom: '-', targetPrice: '0', listedPrice: '-', productId: '', variantId: '' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInfo, setSelectedInfo] = useState<SelectedInfo | null>(null);
  const [datePickerActive, setDatePickerActive] = useState(false);

  const quoteCreateMutation = useQuoteCreateWithQuoteId();

  const { mutateAsync: getCustomerPartnerNumber } = useCustomerPartnerNumberBySkuMutation();

  const [errors, setErrors] = useState({
    customer: '',
    location: '',
    products: {} as Record<number, string>,
    notes: '',
    poNumber: '',
    expirationDate: '',
  });

  useEffect(() => {
    if (resubmitQuoteId) {
      quoteCreateMutation.mutate({
        storeName,
        quoteId: Number(resubmitQuoteId),
        companyLocationId: resubmitCompanyLocationId || '',
        customerId: resubmitCustomerId || '',
      });
    }
  }, [resubmitQuoteId, storeName, resubmitCustomerId, resubmitCompanyLocationId]);

  const quoteDetailsData = quoteCreateMutation.data;
  const isLoadingQuoteDetails = quoteCreateMutation.isPending;

  useEffect(() => {
    if (quoteDetailsData && resubmitQuoteId) {
      if (quoteDetailsData?.customer) {
        setSelectedInfo({
          customer: {
            id: quoteDetailsData.customer.id,
            firstName: quoteDetailsData.customer.firstName || '',
            lastName: quoteDetailsData.customer.lastName || '',
            email: quoteDetailsData.customer.email || '',
            phone: quoteDetailsData.customer.phone || '',
          },
          location: quoteDetailsData.companyLocationDetails
            ? {
                companyId: quoteDetailsData.companyLocationDetails.company.id,
                companyName: quoteDetailsData.companyLocationDetails.company.name,
                locationId: quoteDetailsData.companyLocationDetails.id,
                locationName: quoteDetailsData.companyLocationDetails.name,
              }
            : null,
        });
      }

      if (quoteDetailsData.poNumber) {
        setPoNumber(quoteDetailsData.poNumber);
      }

      const expiryDate = quoteDetailsData?.expirationDate || null;
      if (expiryDate) {
        setExpirationDate(new Date(expiryDate));
      }

      const notesContent = quoteDetailsData?.notes?.[0]?.noteContent || '';
      if (notesContent) {
        setNotes(notesContent);
      }

      if (quoteDetailsData.quoteItems && quoteDetailsData.quoteItems.length > 0) {
        const mappedProducts = quoteDetailsData.quoteItems.map((item, index) => {
          return {
            id: index + 1,
            product: item?.variant?.product?.title || '',
            qty: String(item.quantity || 1),
            uom: item?.variant?.metafield?.value || '-',
            targetPrice: String(item.offerPrice || 0),
            listedPrice: String(item.originalPrice || '-'),
            productId: item.productId || item.variant?.product?.id,
            variantId: item.variantId || item.variant?.id,
          };
        });

        setProducts(mappedProducts);
      }
    }
  }, [quoteDetailsData, resubmitQuoteId]);

  const { data: productVariantsData } = useGetProductVariantsByApi({
    query: [searchQuery],
    storeName,
    customerId: selectedInfo?.customer?.id || '',
    companyLocationId: selectedInfo?.location?.locationId || '',
    companyId: selectedInfo?.location?.companyId || '',
  });

  const { mutate: createQuote } = useCreateQuote();

  const validateForm = () => {
    const newErrors = {
      customer: '',
      location: '',
      products: {} as Record<number, string>,
      notes: '',
      poNumber: '',
      expirationDate: '',
    };

    let isValid = true;

    if (!selectedInfo?.customer?.id) {
      newErrors.customer = t('admin-portal.quoteCreate.errors.customer-required');
      isValid = false;
    }

    if (selectedInfo?.customer?.id && !selectedInfo?.location?.locationId) {
      newErrors.location = t('admin-portal.quoteCreate.errors.location-required');
      isValid = false;
    }

    if (!expirationDate) {
      newErrors.expirationDate = t('admin-portal.quoteCreate.errors.expiration-date-required');
      isValid = false;
    }

    let hasValidProducts = false;
    products.forEach((product) => {
      if (!product.product || product.productId === '' || product.variantId === '') {
        newErrors.products[product.id] = t('admin-portal.quoteCreate.errors.product-required');
        isValid = false;
      } else {
        hasValidProducts = true;
      }
    });

    if (products.length === 0 || !hasValidProducts) {
      isValid = false;
      if (products.length === 0) {
        toast.error(t('admin-portal.quoteCreate.errors.no-products'));
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const quoteData = {
      storeName,
      quote: {
        requestNote: notes,
        customerId: selectedInfo?.customer?.id || '',
        companyLocationId: selectedInfo?.location?.locationId || '',
        currencyCode: 'USD',
        poNumber: poNumber,
        expirationDate: expirationDate ? expirationDate.toISOString() : null,
        quoteItems: products.map((product) => ({
          productId: product?.productId,
          variantId: product?.variantId,
          quantity: parseInt(product.qty) || 0,
          originalPrice: parseFloat(product.listedPrice) || 0,
          offerPrice: parseFloat(product.targetPrice) || 0,
        })),
      },
    };

    createQuote(quoteData, {
      onSuccess: (res) => {
        toast.success(t('admin-portal.quoteCreate.quote-created-success'));
        queryClient.invalidateQueries({
          queryKey: [QUERY_ADMIN_PORTAL_QUOTES_LIST],
        });
        navigate(`/app/quotes/${res?.id}?companyLocationId=${selectedInfo?.location?.locationId}&customerId=${selectedInfo?.customer?.id}`);
      },
      onError: (error) => {
        toast.error(error?.message);
      },
    });
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (value.trim()) {
      setErrors((prev) => ({
        ...prev,
        notes: '',
      }));
    }
  };

  const handlePoNumberChange = (value: string) => {
    setPoNumber(value);
    if (value.trim()) {
      setErrors((prev) => ({
        ...prev,
        poNumber: '',
      }));
    }
  };

  const handleExpirationDateChange = (date: { start: Date }) => {
    setExpirationDate(date.start);
    setErrors((prev) => ({
      ...prev,
      expirationDate: '',
    }));
  };

  const addProduct = () => {
    setProducts([...products, { id: Date.now(), product: '', qty: '0', uom: '-', targetPrice: '0', listedPrice: '-', productId: '', variantId: '' }]);
  };

  const cleanAll = () => {
    setProducts([]);
  };

  const removeProduct = (id: number) => {
    setProducts(products.filter((product) => product.id !== id));
  };

  const handleCustomerSelect = (customerInfo: SelectedInfo) => {
    setSelectedInfo({
      customer: customerInfo.customer,
      location: customerInfo.location,
    });

    setErrors((prev) => ({
      ...prev,
      customer: '',
      location: customerInfo.location ? '' : prev.location,
    }));
  };

  const debouncedSetSearchQuery = useMemo(
    () =>
      _.debounce((value: string) => {
        setSearchQuery(value);
      }, 500),
    [],
  );

  const updateSearchQuery = (productId: number, value: string) => {
    updateProductField(productId, 'product', value);

    debouncedSetSearchQuery(value);

    if (value) {
      setErrors((prev) => ({
        ...prev,
        products: {
          ...prev.products,
          [productId]: '',
        },
      }));
    }
  };

  const updateProductField = (id: number, field: string, value: string) => {
    // For qty field validation (unchanged)
    if (field === 'qty') {
      // Check for special characters - only allow digits (no decimals)
      const containsOnlyDigits = /^\d*$/.test(value);

      if (!containsOnlyDigits) {
        // Remove any non-digit characters (including decimal points)
        const sanitizedValue = value.replace(/\D/g, '');
        setProducts(products.map((product) => (product.id === id ? { ...product, qty: sanitizedValue } : product)));
        return;
      }

      if (Number(value) < 1) {
        return;
      }
    }

    // New validation for target price
    if (field === 'targetPrice') {
      // Remove minus sign if present
      if (value.includes('-')) {
        value = value.replace(/-/g, '');
      }

      // Only allow numbers with up to two decimal places
      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
        setProducts(products.map((product) => (product.id === id ? { ...product, [field]: value } : product)));
      }

      return;
    }

    // Default handling for other fields
    setProducts(products.map((product) => (product.id === id ? { ...product, [field]: value } : product)));

    if (field === 'product' && value && errors.products[id]) {
      setErrors((prev) => ({
        ...prev,
        products: {
          ...prev.products,
          [id]: '',
        },
      }));
    }
  };

  const handleProductSelect = (productId: number, selectedItem: any) => {
    const productVariant = selectedItem.product;
    // Instead of always taking the first variant, we need to identify the correct variant
    // based on the selected item value which should match a variant ID
    const selectedVariantId = selectedItem.value;

    // Find the specific variant that was selected
    const variantNode = productVariant.variants?.nodes?.find((variant: any) => variant.id === selectedVariantId) || productVariant.variants?.nodes?.[0]; // Fallback to first if not found

    // Check if this variant already exists in the products array
    const existingProductIndex = products.findIndex(product => product.variantId === variantNode.id);
    
    if (existingProductIndex !== -1 && existingProductIndex !== products.findIndex(p => p.id === productId)) {
      // Variant already exists in another row, increase quantity instead of adding new product
      const newProducts = [...products];
      
      // Parse the existing quantity and add 1 (or the minimum quantity)
      const minQty = variantNode?.contextualPricing?.quantityRule?.minimum || 1;
      const currentQty = parseInt(newProducts[existingProductIndex].qty) || 0;
      newProducts[existingProductIndex].qty = String(currentQty + (minQty > 1 ? minQty : 1));
      
      // Remove the empty row that was being used for adding a new product
      if (!products.find(p => p.id === productId)?.productId) {
        const filteredProducts = newProducts.filter(p => p.id !== productId);
        setProducts(filteredProducts);
      } else {
        setProducts(newProducts);
      }
      
      setSearchQuery('');
      
      // Clear any errors
      setErrors((prev) => ({
        ...prev,
        products: {
          ...prev.products,
          [productId]: '',
        },
      }));
      
      return;
    }

    const uom = variantNode?.metafield?.value || '-';
    const price = variantNode?.contextualPricing?.price?.amount || '-';
    const qty = variantNode?.contextualPricing?.quantityRule?.minimum || 1;

    const newProducts = products.map((product) => {
      if (product.id === productId) {
        return {
          ...product,
          qty: String(qty),
          product: selectedItem.label,
          uom: uom,
          listedPrice: price,
          targetPrice: price,
          productId: productVariant.id,
          variantId: variantNode.id,
        };
      }
      return product;
    });

    setProducts(newProducts);
    setSearchQuery('');

    setErrors((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        [productId]: '',
      },
    }));
  };

  // First, let's create state to store our product options
  const [finalProductOptions, setFinalProductOptions] = useState<any[]>([]);

  // Basic product options calculation without partner number logic
  const basicProductOptions = useMemo(() => {
    if (!productVariantsData?.products || productVariantsData.products.length === 0) {
      return [];
    }

    // Check if we're searching by SKU
    const isSkuSearch = searchQuery && searchQuery.trim() !== '';
    let allOptions: any[] = [];

    if (isSkuSearch) {
      // Continue with the existing SKU-based search
      productVariantsData.products.forEach((product: any) => {
        if (product.variants?.nodes) {
          const matchingVariants = product.variants.nodes.filter(
            (variant: any) => variant.sku && variant.sku.toLowerCase().includes(searchQuery.toLowerCase()),
          );

          if (matchingVariants.length > 0) {
            // Add matching variants to options
            const variantOptions = matchingVariants.map((variant: any) => ({
              value: variant.id,
              label: product.title,
              product: product,
              sku: variant.sku, // Store SKU for later partner matching
            }));
            allOptions = [...allOptions, ...variantOptions];
          }
        }
      });

      if (allOptions.length === 0) {
        productVariantsData.products.forEach((product: any) => {
          if (product.variants?.nodes) {
            const variantOptions = product.variants.nodes.map((variant: any) => ({
              value: variant.id,
              label: product.title,
              product: product,
              sku: variant.sku, // Store SKU for later partner matching
            }));
            allOptions = [...allOptions, ...variantOptions];
          }
        });
      }
    }

    return allOptions;
  }, [productVariantsData?.products, searchQuery]);

  // Now use useEffect to check for partner numbers after we have search results
  useEffect(() => {
    // Set the basic options first as default
    setFinalProductOptions(basicProductOptions);

    // If we have results and a location, check for partner numbers
    if (basicProductOptions.length > 0 && selectedInfo?.location?.companyId) {
      // Extract SKUs from the options
      const skuList = basicProductOptions.map((option) => option.sku).filter(Boolean); // Filter out any undefined/null SKUs

      if (skuList.length > 0) {
        getCustomerPartnerNumber({
          storeName,
          skuIds: skuList,
          companyId: selectedInfo?.location?.companyId || '',
        })
          .then((customerPartnerData) => {
            // Check if we have customer partner number details
            if (customerPartnerData?.customerPartnerNumberDetails && Array.isArray(customerPartnerData.customerPartnerNumberDetails)) {
              // Extract all partner numbers from the results
              const partnerNumbers = customerPartnerData.customerPartnerNumberDetails.map((detail: any) => detail.customerPartnerNumber).filter(Boolean);

              // Now check all variants from products for matching customerPartnerNumber
              const partnerMatchOptions: any[] = [];

              productVariantsData?.products?.forEach((product: any) => {
                if (product.variants?.nodes) {
                  const matchingVariants = product.variants.nodes.filter(
                    (variant: any) => variant.customerPartnerNumber && partnerNumbers.includes(variant.customerPartnerNumber) && skuList.includes(variant.sku),
                  );

                  if (matchingVariants.length > 0) {
                    // Add variants with matching partner numbers to options with priority
                    const variantOptions = matchingVariants.map((variant: any) => ({
                      value: variant.id,
                      label: product.title,
                      product: product,
                      isPartnerMatch: true,
                      sku: variant.sku,
                    }));

                    partnerMatchOptions.push(...variantOptions);
                  }
                }
              });

              // If we have partner matches, use ONLY those
              if (partnerMatchOptions.length > 0) {
                setFinalProductOptions(partnerMatchOptions);
              }
              // Otherwise, keep the basicProductOptions (set at the beginning)
            } else if (customerPartnerData?.customerPartnerNumberDetails?.customerPartnerNumber) {
              // Handle the case where it's a single object instead of an array
              const partnerNumber = customerPartnerData.customerPartnerNumberDetails.customerPartnerNumber;

              // Now check all variants from products for matching customerPartnerNumber
              const partnerMatchOptions: any[] = [];

              productVariantsData?.products?.forEach((product: any) => {
                if (product.variants?.nodes) {
                  const matchingVariants = product.variants.nodes.filter(
                    (variant: any) => variant.customerPartnerNumber === partnerNumber && skuList.includes(variant.sku),
                  );

                  if (matchingVariants.length > 0) {
                    // Add variants with matching partner numbers to options with priority
                    const variantOptions = matchingVariants.map((variant: any) => ({
                      value: variant.id,
                      label: product.title,
                      product: product,
                      isPartnerMatch: true,
                      sku: variant.sku,
                    }));

                    partnerMatchOptions.push(...variantOptions);
                  }
                }
              });

              // If we have partner matches, use ONLY those
              if (partnerMatchOptions.length > 0) {
                setFinalProductOptions(partnerMatchOptions);
              }
              // Otherwise, keep the basicProductOptions (set at the beginning)
            }
          })
          .catch((error) => {
            console.error('Error fetching customer partner number:', error);
          });
      }
    }
  }, [basicProductOptions, selectedInfo?.location?.companyId, productVariantsData?.products, getCustomerPartnerNumber, storeName]);

  const rows = products.map((product) => {
    const qtyCell = (
      <div className="flex max-w-[200px] items-center gap-2 py-4">
        <TextField
          key={`qty-${product.id}`}
          type="number"
          value={product.qty}
          onChange={(value) => updateProductField(product.id, 'qty', value)}
          placeholder="Qty"
          label=""
          autoComplete="off"
          min={0}
        />
        <Text
          variant="bodyLg"
          fontWeight="regular"
          as="span"
        >
          {product?.qty || 1}{' '}
          {Number(product?.qty) > 1 ? t('admin-portal.quoteDetails.order-summary.items') : t('admin-portal.quoteDetails.order-summary.item')}
        </Text>
      </div>
    );

    return [
      <div
        key={`product-search-${product.id}`}
        className="relative w-[400px]"
      >
        <Combobox
          key={product.id}
          activator={
            <Combobox.TextField
              autoComplete="off"
              label=""
              placeholder="Enter Product Name or Item Number"
              value={product.product}
              onChange={(value) => updateSearchQuery(product.id, value)}
              error={Boolean(errors.products[product.id])}
            />
          }
          onScrolledToBottom={() => {}}
        >
          {finalProductOptions.length > 0 ? (
            <div className="pb-4">
              <Listbox
                autoSelection={AutoSelection.None}
                onSelect={(value) =>
                  handleProductSelect(
                    product.id,
                    finalProductOptions.find((option: any) => option.value === value),
                  )
                }
              >
                {finalProductOptions.map((option: any) => (
                  <Listbox.Option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </Listbox.Option>
                ))}
              </Listbox>
            </div>
          ) : null}
        </Combobox>
        {errors.products[product.id] && (
          <div className="absolute -bottom-6 left-0">
            <InlineError
              message={errors.products[product.id]}
              fieldID={`product-${product.id}`}
            />
          </div>
        )}
      </div>,
      qtyCell,
      product.uom,
      <TextField
        key={`target-${product.id}`}
        label=""
        type="number"
        value={product.targetPrice}
        onChange={(value) => updateProductField(product.id, 'targetPrice', value)}
        placeholder="Target Price"
        prefix="$"
        autoComplete="off"
        min={0}
      />,
      product.listedPrice,
      <Button
        key={product.id}
        onClick={() => removeProduct(product.id)}
        variant="plain"
        icon={
          <Icon
            source={() => (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-x"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            )}
          />
        }
      />,
    ];
  });

  const formatDate = (date?: Date) => {
    if (!date) return '';
    // Use local date formatting instead of ISO string to prevent timezone issues
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const toggleDatePicker = () => setDatePickerActive(!datePickerActive);

  useEffect(() => {
    if (selectedInfo?.location && selectedInfo?.location?.locationId !== resubmitCompanyLocationId) {
      // Reset products when location changes
      setProducts([{ id: 1, product: '', qty: '0', uom: '-', targetPrice: '0', listedPrice: '-', productId: '', variantId: '' }]);
    }
  }, [selectedInfo?.location, selectedInfo?.location?.locationId, resubmitCompanyLocationId]);

  if (isLoadingQuoteDetails) {
    return (
      <Frame>
        <Loading />
      </Frame>
    );
  }

  return (
    <Page
      backAction={{
        content: t('common.text.back'),
        url: '/app/quotes',
        accessibilityLabel: t('common.text.back'),
      }}
      title={resubmitQuoteId ? t('admin-portal.quoteCreate.resubmit-title') : t('admin-portal.quoteCreate.title')}
    >
      <div className="mb-5 flex justify-end">
        <ChangeLanguageSelector />
      </div>
      <Card background="bg-surface-secondary">
        <div className="mb-4 flex items-center justify-between">
          <Text
            variant="headingMd"
            as="h5"
          >
            {t('admin-portal.quoteCreate.information')}
          </Text>
        </div>

        <Grid columns={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2 }}>
          <Grid.Cell columnSpan={{ xs: 2, sm: 2, md: 2, lg: 2, xl: 2 }}>
            <CustomerAutocomplete
              onSelect={handleCustomerSelect}
              customerError={errors.customer}
              locationError={errors.location}
              initialSelectedInfo={selectedInfo}
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}>
            <div className="space-y-4">
              <TextField
                label={t('admin-portal.quoteCreate.po-number')}
                value={poNumber}
                onChange={handlePoNumberChange}
                autoComplete="off"
                placeholder={t('admin-portal.quoteCreate.po-number-placeholder')}
                error={errors.poNumber}
              />
            </div>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}>
            <Popover
              active={datePickerActive}
              autofocusTarget="none"
              onClose={toggleDatePicker}
              activator={
                <TextField
                  label={t('admin-portal.quoteCreate.expiration-date')}
                  value={formatDate(expirationDate)}
                  onFocus={toggleDatePicker}
                  autoComplete="off"
                  error={errors.expirationDate}
                  placeholder={t('admin-portal.quoteCreate.expiration-date-placeholder')}
                />
              }
              preferredPosition="below"
              preferredAlignment="left"
            >
              <Box padding="400">
                <DatePicker
                  selected={expirationDate}
                  onChange={handleExpirationDateChange}
                  onMonthChange={(month: number, year: number) => setExpirationDate(new Date(year, month, 1))}
                  month={expirationDate ? expirationDate.getMonth() : new Date().getMonth()}
                  year={expirationDate ? expirationDate.getFullYear() : new Date().getFullYear()}
                  disableDatesBefore={new Date()}
                />
              </Box>
            </Popover>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}>
            <TextField
              label={t('admin-portal.quoteCreate.notes')}
              value={notes}
              onChange={handleNotesChange}
              multiline={4}
              autoComplete="off"
              placeholder={t('admin-portal.quoteCreate.notes-placeholder')}
              error={errors.notes}
            />
          </Grid.Cell>
        </Grid>
      </Card>

      <div className="mt-4">
        <Card>
          <BlockStack>
            <Box>
              <Text
                variant="headingMd"
                as="h6"
              >
                {t('admin-portal.quoteCreate.products')}
              </Text>
            </Box>
            <Box>
              <DataTable
                verticalAlign="middle"
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                headings={[
                  t('admin-portal.quoteCreate.table.product'),
                  t('admin-portal.quoteCreate.table.qty'),
                  t('admin-portal.quoteCreate.table.uom'),
                  t('admin-portal.quoteCreate.table.target-price'),
                  t('admin-portal.quoteCreate.table.listed-price'),
                  '',
                ]}
                rows={rows}
              />

              <Box padding="400">
                <InlineStack
                  align="space-between"
                  blockAlign="center"
                  wrap={false}
                >
                  <Button onClick={addProduct}>{t('admin-portal.quoteCreate.add-more-products')}</Button>
                  <Button
                    onClick={cleanAll}
                    variant="plain"
                  >
                    {t('admin-portal.quoteCreate.clean-all')}
                  </Button>
                </InlineStack>
              </Box>
            </Box>
          </BlockStack>
        </Card>

        <Box paddingBlock="400">
          <InlineStack
            align="center"
            blockAlign="center"
            wrap={false}
            gap="400"
          >
            <Button
              size="large"
              onClick={() => navigate('/app/quotes')}
            >
              {t('common.text.back')}
            </Button>
            <Button
              size="large"
              variant="primary"
              onClick={handleSubmit}
            >
              {t('admin-portal.quoteCreate.submit-request')}
            </Button>
          </InlineStack>
        </Box>
      </div>
    </Page>
  );
}
