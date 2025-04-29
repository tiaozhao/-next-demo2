import { InlineStack, Select, TextField } from "@shopify/polaris";
import _ from "lodash";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminPortalCompanyAndCompanyLocations } from "~/hooks/use-customer-partner-number";
import { extractIdFromGid } from "~/lib/utils";

interface SubscriptionPlanFilterProps {
  onFilter: (filter: { name?: string; companyLocationId?: string }) => void;
}

export function SubscriptionPlanFilter({
  onFilter,
}: SubscriptionPlanFilterProps) {
  const { t } = useTranslation();
  const i18nPath = "admin-portal.subscription-plan.list.filter";
  const [name, setName] = useState("");
  const [companyLocationId, setCompanyLocationId] = useState("");

  const {
    data: companyAndCompanyLocations,
    isLoading: isLoadingCompanyAndCompanyLocations,
  } = useAdminPortalCompanyAndCompanyLocations();

  const [companyLocationOptions, setCompanyLocationOptions] = useState<
    { label: string; value: string }[]
  >([]);

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

  const handleNameChange = useCallback((value: string) => setName(value), []);

  const handleCompanyLocationIdChange = useCallback(
    (value: string) => setCompanyLocationId(value),
    [],
  );

  const debouncedFilter = useCallback(
    _.debounce((newFilters: { name?: string; companyLocationId?: string }) => {
      onFilter(newFilters);
    }, 500),
    [],
  );

  useEffect(() => {
    const newFilters = {
      ...(name ? { name } : {}),
      ...(companyLocationId ? { companyLocationId } : {}),
    };
    debouncedFilter(newFilters);
  }, [name, companyLocationId]);

  return (
    <InlineStack gap="400">
      <TextField
        autoComplete="off"
        label={""}
        placeholder={t(`${i18nPath}.name`)}
        value={name}
        onChange={handleNameChange}
      />
      <Select
        disabled={isLoadingCompanyAndCompanyLocations}
        label={""}
        placeholder={t(`${i18nPath}.company-location`)}
        options={companyLocationOptions}
        value={companyLocationId}
        onChange={handleCompanyLocationIdChange}
      />
    </InlineStack>
  );
}
