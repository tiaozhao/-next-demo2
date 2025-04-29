import { globalFetch } from "~/lib/fetch";
import type {
  CancelQuoteRequest,
  BulkDeleteQuotesRequest,
  QuoteDetailsRequest,
  UpdateQuoteItemsRequest,
  CreateQuoteInput,
  FetchQuotesParams,
  QuoteListResponse,
  QuoteResponse,
  QuoteWithCustomer,
  ApproveQuoteRequest,
  RejectQuoteRequest,
  ConvertQuoteToOrderRequest,
  ConvertQuoteToOrderResponse
} from "~/types/quotes/quote.schema";

export const getQuotesList = async (params: FetchQuotesParams) => {
  const response = await globalFetch("/quotes/fetch-all", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return response as QuoteListResponse;
};

export const createQuote = async (params: CreateQuoteInput) => {
  const response = await globalFetch("/quotes/create", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return response as QuoteWithCustomer;
};

export const getQuoteById = async (params: QuoteDetailsRequest) => {
  const response = await globalFetch("/quotes/get-by-id", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return response as QuoteListResponse;
};

export const approveQuote = async (params: ApproveQuoteRequest) => {
  const response = await globalFetch("/quotes/approve", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return response as QuoteWithCustomer;
};

export const updateQuoteItems = async (params: UpdateQuoteItemsRequest) => {
  const response = await globalFetch("/quotes/items/update", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return response;
};

export const getQuoteDetails = async (params: QuoteDetailsRequest) => {
  const response = await globalFetch("/quotes/get-by-id", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return response as QuoteResponse;
};

export const declineQuote = async (params: RejectQuoteRequest) => {
  const response = await globalFetch("/quotes/reject", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return response as QuoteWithCustomer;
};

export const convertQuoteToDraftOrder = async (
  params: ConvertQuoteToOrderRequest,
) => {
  const response = await globalFetch("/quotes/convert-to-order", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return response as ConvertQuoteToOrderResponse;
};

export const cancelQuote = async (params: CancelQuoteRequest) => {
  const response = await globalFetch("/quotes/cancel", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return response as QuoteWithCustomer;
};

export const deleteQuote = async (params: BulkDeleteQuotesRequest) => {
  const response = await globalFetch("/quotes/bulk-delete", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return response as QuoteResponse;
};

export const convertQuoteToOrder = async (
  params: ConvertQuoteToOrderRequest,
) => {
  const response = await globalFetch("/quotes/convert-to-order", {
    method: "POST",
    body: JSON.stringify(params),
  });

  return response as ConvertQuoteToOrderResponse;
};
