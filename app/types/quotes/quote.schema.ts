/**
 * Main export file for Quote related schemas and types
 */

// Re-export from base schema
export {
  QuoteStatus,
  quoteItemSchema,
  quoteDataSchema,
  quotePaginationSchema,
  quoteFilterSchema,
  quoteSortFieldSchema,
  quoteSortItemSchema,
  quoteSortSchema,
  quoteNoteSchema,
  QuoteNoteType
} from './quote-base.schema';

// Re-export types from base schema
export type {
  QuoteStatusType,
  QuoteNoteTypeEnum,
  CustomerInfo,
  QuoteItem,
  QuoteData,
  QuotePagination,
  QuoteFilter,
  QuoteSortField,
  QuoteSortItem,
  QuoteNoteInput,
  QuoteInput
} from './quote-base.schema';

// Re-export from requests schema
export {
  createQuoteSchema,
  updateQuoteSchema,
  updateQuoteStatusSchema,
  quoteSearchSchema,
  fetchQuotesSchema,
  quoteDetailsRequestSchema,
  approveQuoteSchema,
  rejectQuoteSchema,
  cancelQuoteSchema,
  expireQuoteSchema,
  bulkDeleteQuotesSchema,
  quoteItemUpdateSchema,
  updateQuoteItemsSchema,
  convertQuoteToOrderSchema
} from './quote-requests.schema';

// Re-export types from requests schema
export type {
  CreateQuoteInput,
  UpdateQuoteInput,
  UpdateQuoteStatusInput,
  QuoteSearchParams,
  FetchQuotesParams,
  QuoteDetailsRequest,
  ApproveQuoteRequest,
  RejectQuoteRequest,
  CancelQuoteRequest,
  ExpireQuoteRequest,
  BulkDeleteQuotesRequest,
  QuoteItemUpdate,
  UpdateQuoteItemsRequest,
  ConvertQuoteToOrderRequest
} from './quote-requests.schema';

// Re-export from responses schema
export {
  quoteResponseSchema,
  quoteWithCustomerSchema,
  quoteListResponseSchema,
  expireQuoteResponseSchema,
  convertQuoteToOrderResponseSchema
} from './quote-responses.schema';

// Re-export types from responses schema
export type {
  QuoteResponse,
  QuoteWithCustomer,
  QuoteListResponse,
  ExpireQuoteResponse,
  ConvertQuoteToOrderResponse
} from './quote-responses.schema';
