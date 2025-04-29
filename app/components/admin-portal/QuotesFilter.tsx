import { TextField } from "@shopify/polaris";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DatePickerField } from "~/components/admin-portal/DatePickerField";
import { SelectField } from "~/components/admin-portal/SelectField";
import { useAdminPortalCompanyAndCompanyLocations } from "~/hooks/use-customer-partner-number";
import { extractIdFromGid } from "~/lib/utils";

interface QuotesFilterProps {
  onFilter: (filter: {
    quoteNumber?: string;
    status?: string;
    poNumber?: string;
    createdAt?: string;
    updatedAt?: string;
    owner?: string;
  }) => void;
  storeName: string;
}

const statusOptions = [
  { label: "Submitted", value: "Submitted" },
  { label: "Approved", value: "Approved" },
  { label: "Ordered", value: "Ordered" },
  { label: "Cancelled", value: "Cancelled" },
  { label: "Declined", value: "Declined" },
  { label: "Expired", value: "Expired" },
];

export function QuotesFilter({ onFilter, storeName }: QuotesFilterProps) {
  const { t } = useTranslation();
  const [quoteNumber, setQuoteNumber] = useState("");
  const [status, setStatus] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [customer, setCustomer] = useState("");
  const [companyLocationId, setCompanyLocationId] = useState("");
  const [companyLocationOptions, setCompanyLocationOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const {
    data: companyAndCompanyLocations,
    isLoading: isLoadingCompanyAndCompanyLocations,
  } = useAdminPortalCompanyAndCompanyLocations();

  // Store previous filter values to avoid unnecessary updates
  const previousFiltersRef = useRef({});

  const handleQuoteNumberChange = useCallback(
    (value: string) => setQuoteNumber(value),
    [],
  );

  const handleStatusChange = useCallback(
    (value: string) => setStatus(value),
    [],
  );

  const handlePoNumberChange = useCallback(
    (value: string) => setPoNumber(value),
    [],
  );

  const handleCreatedAtChange = useCallback(
    (value: string) => setCreatedAt(value),
    [],
  );

  const handleExpirationDateChange = useCallback(
    (value: string) => setExpirationDate(value),
    [],
  );

  const handleCustomerChange = useCallback(
    (value: string) => setCustomer(value),
    [],
  );

  const handleCompanyLocationIdChange = useCallback(
    (value: string) => setCompanyLocationId(value),
    [],
  );

  useEffect(() => {
    if (companyAndCompanyLocations) {
      const flatLocationOptions: { label: string; value: string }[] = [];
      companyAndCompanyLocations.forEach((company) => {
        company.locations.nodes.forEach((location) => {
          flatLocationOptions.push({
            label: `${location.name} - ${location?.externalId || extractIdFromGid(location.id, "CompanyLocation")}`,
            value: location.id,
          });
        });
      });
      setCompanyLocationOptions(flatLocationOptions);
    }
  }, [companyAndCompanyLocations]);

  useEffect(() => {
    // Build new filter object
    const newFilters = {
      ...(quoteNumber ? { id: Number(quoteNumber) } : {}),
      ...(status ? { status } : {}),
      ...(poNumber ? { poNumber } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(expirationDate ? { expirationDate } : {}),
      ...(customer ? { customer } : {}),
      ...(companyLocationId ? { companyLocationId } : {}),
    };

    // Check if filters have changed from previous state
    const prevFilters = previousFiltersRef.current;
    const filtersChanged =
      JSON.stringify(prevFilters) !== JSON.stringify(newFilters);

    // Only call onFilter when filters have actually changed
    if (filtersChanged) {
      previousFiltersRef.current = newFilters;
      onFilter(newFilters);
    }
  }, [
    quoteNumber,
    status,
    poNumber,
    createdAt,
    expirationDate,
    customer,
    companyLocationId,
    onFilter,
  ]);

  return (
    <div className="flex justify-between gap-2">
      <TextField
        label=""
        placeholder={t("admin-portal.quotes.filter.quote-number-placeholder")}
        value={quoteNumber}
        onChange={handleQuoteNumberChange}
        autoComplete="off"
        labelHidden
      />

      <SelectField
        options={statusOptions}
        value={status}
        onChange={handleStatusChange}
        placeholder={t("admin-portal.quotes.filter.status-placeholder")}
        labelHidden
      />

      <TextField
        label=""
        placeholder={t("admin-portal.quotes.filter.po-number-placeholder")}
        value={poNumber}
        onChange={handlePoNumberChange}
        autoComplete="off"
        labelHidden
      />

      <DatePickerField
        storeName={storeName}
        placeholder={t("admin-portal.quotes.filter.created-at-placeholder")}
        value={createdAt}
        onChange={handleCreatedAtChange}
      />

      <DatePickerField
        placeholder={t(
          "admin-portal.quotes.filter.expiration-date-placeholder",
        )}
        value={expirationDate}
        onChange={handleExpirationDateChange}
        storeName={storeName}
      />

      <SelectField
        options={companyLocationOptions}
        value={companyLocationId}
        onChange={handleCompanyLocationIdChange}
        placeholder={t(
          "admin-portal.quotes.filter.customer-account-placeholder",
        )}
        labelHidden
      />

      <TextField
        label=""
        placeholder={t("admin-portal.quotes.filter.customer-placeholder")}
        value={customer}
        onChange={handleCustomerChange}
        autoComplete="off"
        labelHidden
      />
    </div>
  );
}
