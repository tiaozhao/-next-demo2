import { z } from "zod";
import { globalFetch } from "~/lib/fetch";
import {
  CreateSellingPlanRequest,
  CreateSellingPlanResponse,
  DeleteSellingPlanRequest,
  DeleteSellingPlanResponse,
  FetchSellingPlansRequest,
  FetchSellingPlansResponse,
  GetSellingPlanByIdRequest,
  SellingPlanWithLines,
  UpdateSellingPlanResponse,
  updateSellingPlanSchema,
} from "~/types/selling-plans/selling-plan.schema";

export const createSubscriptionPlan = async (
  params: CreateSellingPlanRequest,
) => {
  const res = await globalFetch("/selling-plans/create", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return res as CreateSellingPlanResponse;
};

export const getSubscriptionPlan = async (params: FetchSellingPlansRequest) => {
  const res = await globalFetch("/selling-plans/fetch-all", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return res as FetchSellingPlansResponse;
};

export const deleteSubscriptionPlan = async (
  params: DeleteSellingPlanRequest,
) => {
  const res = await globalFetch("/selling-plans/delete", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return res as DeleteSellingPlanResponse;
};

export const getSubscriptionPlanById = async (
  params: GetSellingPlanByIdRequest,
) => {
  const res = await globalFetch("/selling-plans/get-by-id", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return res as SellingPlanWithLines;
};

export const updateSubscriptionPlan = async (
  params: z.infer<typeof updateSellingPlanSchema>,
) => {
  const res = await globalFetch("/selling-plans/update", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return res as UpdateSellingPlanResponse;
};
