import { useMutation, useQuery } from "@tanstack/react-query";
import _ from "lodash";
import {
  CHECK_IS_VALID_SUBSCRIPTION_PLAN,
  QUERY_ALL_SUBSCRIPTION_PLANS,
  QUERY_SUBSCRIPTION_PLAN_BY_ID,
} from "~/constant/react-query-keys";
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptionPlan,
  getSubscriptionPlanById,
  updateSubscriptionPlan,
} from "~/request/subscription-plan";
import {
  FetchSellingPlansRequest,
  GetSellingPlanByIdRequest,
} from "~/types/selling-plans/selling-plan.schema";

export const useCreateSubscriptionPlan = () => {
  return useMutation({ mutationFn: createSubscriptionPlan });
};

export const useGetSubscriptionPlan = (
  params: FetchSellingPlansRequest,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: [QUERY_ALL_SUBSCRIPTION_PLANS, params],
    queryFn: () => getSubscriptionPlan(params),
    enabled: enabled && !!params,
  });
};

export const useDeleteSubscriptionPlan = () => {
  return useMutation({ mutationFn: deleteSubscriptionPlan });
};

export const useGetSubscriptionPlanById = (
  params: GetSellingPlanByIdRequest,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: [QUERY_SUBSCRIPTION_PLAN_BY_ID, params],
    queryFn: () => getSubscriptionPlanById(params),
    enabled: enabled && !!params,
  });
};

export const useUpdateSubscriptionPlan = () => {
  return useMutation({ mutationFn: updateSubscriptionPlan });
};

export const useCheckIsValidSubscriptionPlanV2 = (
  params: GetSellingPlanByIdRequest & {
    frequencyId: string;
  },
  enabled: boolean = true,
) => {
  const { frequencyId, ...rest } = params;

  const { data: subscriptionPlanData, isLoading } = useGetSubscriptionPlanById(
    rest,
    enabled && !!params.id && !!params.frequencyId && !!params.storeName,
  );

  const queryResult = useQuery({
    queryKey: [CHECK_IS_VALID_SUBSCRIPTION_PLAN, params],
    queryFn: () => {
      const frequency = (subscriptionPlanData?.deliveryPolicies || []).find(
        (item) => item.id === _.toNumber(params.frequencyId),
      );
      if (subscriptionPlanData && frequency) {
        return {
          ...subscriptionPlanData,
          deliveryPolicies: [frequency],
        };
      }
      return undefined;
    },
    enabled: !isLoading && !!subscriptionPlanData,
  });

  return {
    ...queryResult,
    isLoading: queryResult.isLoading || isLoading,
  };
};
