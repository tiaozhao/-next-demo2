import prisma from '../../db.server';
import { loggerService } from '../../lib/logger';
import { QuoteError } from '~/lib/errors/quote-errors';
import { DateUtils } from '~/lib/utils/date-utils';
import type {
  UpdateQuoteInput,
  UpdateQuoteStatusInput,
  QuoteInput,
  QuoteStatusType,
  FetchQuotesParams,
  QuoteListResponse,
  QuoteDetailsRequest,
  ApproveQuoteRequest,
  RejectQuoteRequest,
  BulkDeleteQuotesRequest,
  UpdateQuoteItemsRequest,
  CancelQuoteRequest
} from '~/types/quotes/quote.schema';
import { QuoteStatus, QuoteNoteType } from '~/types/quotes/quote.schema';

import _ from 'lodash';

/**
 * Repository class for managing quotes
 * Handles database operations for quotes including creation, updates, and queries
 */
export class QuoteRepository {
  /**
   * Find quote by ID with all related items
   */
  public async findById(id: number) {
    try {
      const quote = await prisma.quote.findUnique({
        where: { id },
        include: {
          quoteItems: true
        }
      });

      if (!quote) {
        throw QuoteError.notFound(id);
      }

      return quote;
    } catch (error) {
      loggerService.error('Error finding quote by ID', {
        error,
        id
      });
      if (error instanceof QuoteError) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Find multiple quotes by their IDs with all related items
   */
  public async findByIds(ids: number[]) {
    try {
      const quotes = await prisma.quote.findMany({
        where: {
          id: {
            in: ids
          }
        },
        include: {
          quoteItems: true
        }
      });

      return quotes;
    } catch (error) {
      loggerService.error('Error finding quotes by IDs', {
        error,
        ids
      });
      throw error;
    }
  }

  /**
   * Find quotes with pagination and filters
   */
  public async findQuotes(params: FetchQuotesParams): Promise<QuoteListResponse> {
    try {
      const { pagination, filter, sort } = params;
      const { page, pageSize } = pagination;

      // Build base where clause
      const where: any = {
        storeName: params.storeName
      };

      // Add companyLocationId to where clause only if it's provided
      if (params.companyLocationId) {
        where.companyLocationId = params.companyLocationId;
      }

      // Add filter conditions if provided
      if (filter) {
        if (filter.id) {
          where.id = filter.id;
        }
        if (filter.customerIds) {
          where.customerId = {
            in: filter.customerIds
          };
        }
        if (filter.companyLocationId) {
          where.companyLocationId = {
            contains: filter.companyLocationId,
            mode: 'insensitive'
          };
        }
        if (filter.currencyCode) {
          where.currencyCode = {
            equals: filter.currencyCode,
            mode: 'insensitive'
          };
        }
        if (filter.createdBy) {
          where.createdBy = {
            contains: filter.createdBy,
            mode: 'insensitive'
          };
        }
        if (filter.updatedBy) {
          where.updatedBy = {
            contains: filter.updatedBy,
            mode: 'insensitive'
          };
        }
        if (filter.actionBy) {
          where.actionBy = {
            contains: filter.actionBy,
            mode: 'insensitive'
          };
        }
        if (filter.poNumber) {
          where.poNumber = {
            contains: filter.poNumber,
            mode: 'insensitive'
          };
        }
        if (filter.status) {
          where.status = filter.status;
        }
        if (filter.createdAt) {
          const date = DateUtils.toPrismaDate(filter.createdAt);
          if (date) {
            where.createdAt = { gte: date };
            loggerService.info('Applied createdAt filter', {
              originalValue: filter.createdAt,
              parsedDate: date.toISOString()
            });
          } else {
            loggerService.warn('Invalid createdAt date format, filter not applied', {
              value: filter.createdAt
            });
          }
        }

        if (filter.updatedAt) {
          const date = DateUtils.toPrismaDate(filter.updatedAt);
          if (date) {
            where.updatedAt = { gte: date };
            loggerService.info('Applied updatedAt filter', {
              originalValue: filter.updatedAt,
              parsedDate: date.toISOString()
            });
          } else {
            loggerService.warn('Invalid updatedAt date format, filter not applied', {
              value: filter.updatedAt
            });
          }
        }

        if (filter.expirationDate) {
          const date = DateUtils.toPrismaDate(filter.expirationDate);
          if (date) {
            where.expirationDate = { gte: date };
            loggerService.info('Applied expirationDate filter', {
              originalValue: filter.expirationDate,
              parsedDate: date.toISOString()
            });
          } else {
            loggerService.warn('Invalid expirationDate format, filter not applied', {
              value: filter.expirationDate
            });
          }
        }
      }

      // Build orderBy with type safety
      const orderBy = sort.map((sortItem: { field: string; order: 'asc' | 'desc' }) => ({
        [sortItem.field]: sortItem.order
      }));

      // Execute query with filters
      const [quotes, totalCount] = await Promise.all([
        prisma.quote.findMany({
          where,
          include: {
            quoteItems: {
              orderBy: {
                id: 'asc'
              }
            },
            notes: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy
        }),
        prisma.quote.count({ where })
      ]);

      return {
        page,
        pageSize,
        totalCount,
        quotes: quotes.map(quote => this.formatQuoteResponse(quote))
      };
    } catch (error) {
      loggerService.error('Error finding quotes', {
        error,
        params
      });
      throw error;
    }
  }

  /**
   * Create a new quote with items
   */
  public async create(input: QuoteInput & { status: QuoteStatusType } & { requestNote?: string } & { expirationDate?: string }) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Calculate subtotal from quoteItems
        const subtotal = input.quote.quoteItems.reduce(
          (sum: number, item) => sum + (item.offerPrice * item.quantity),
          0
        );

        // Process expirationDate if provided
        let expirationDate = undefined;
        if (input.expirationDate) {
          expirationDate = DateUtils.toPrismaDate(input.expirationDate);
          if (expirationDate) {
            loggerService.info('Processed expirationDate for quote creation', {
              originalValue: input.expirationDate,
              parsedDate: expirationDate.toISOString()
            });
          } else {
            loggerService.warn('Invalid expirationDate format for quote creation', {
              value: input.expirationDate
            });
          }
        }

        // Prepare data for quote creation
        const quoteData: any = {
          storeName: input.storeName,
          customerId: input.quote.customerId,
          companyLocationId: input.quote.companyLocationId,
          currencyCode: input.quote.currencyCode,
          poNumber: input.quote.poNumber,
          expirationDate: expirationDate,
          status: input.status,
          createdBy: input.quote.customerId,
          subtotal,
          quoteItems: {
            create: input.quote.quoteItems.map(item => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              originalPrice: item.originalPrice,
              offerPrice: item.offerPrice,
              description: item.description
            }))
          }
        };

        // Add note if requestNote is provided
        if (input.requestNote) {
          quoteData.notes = {
            create: {
              noteType: QuoteNoteType.SUBMITTED,
              noteContent: input.requestNote,
              createdBy: input.quote.customerId
            }
          };
        }

        const quote = await tx.quote.create({
          data: quoteData,
          include: {
            quoteItems: true,
            notes: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        });

        return this.formatQuoteResponse(quote);
      });
    } catch (error) {
      loggerService.error('Error creating quote', {
        error,
        input
      });
      throw error;
    }
  }

  /**
   * Update an existing quote
   */
  public async update(id: number, input: UpdateQuoteInput & { updatedBy: string; status?: QuoteStatusType; actionBy?: string }) {
    try {
      return await prisma.$transaction(async (tx) => {
        if (input.quoteItems) {
          // Delete existing items
          await tx.quoteItem.deleteMany({
            where: { quoteId: id }
          });

          // Calculate new subtotal
          const subtotal = input.quoteItems.reduce(
            (sum: number, item) => sum + (item.offerPrice * item.quantity),
            0
          );

          // Update quote and create new items
          const quote = await tx.quote.update({
            where: { id },
            data: {
              updatedBy: input.updatedBy,
              status: input.status,
              actionBy: input.actionBy,
              subtotal,
              quoteItems: {
                create: input.quoteItems.map(item => ({
                  productId: item.productId,
                  variantId: item.variantId,
                  quantity: item.quantity,
                  originalPrice: item.originalPrice,
                  offerPrice: item.offerPrice,
                  description: item.description
                }))
              }
            },
            include: {
              quoteItems: true
            }
          });

          return this.formatQuoteResponse(quote);
        }

        // Update without items
        const quote = await tx.quote.update({
          where: { id },
          data: {
            updatedBy: input.updatedBy,
            status: input.status,
            actionBy: input.actionBy
          },
          include: {
            quoteItems: true
          }
        });

        return this.formatQuoteResponse(quote);
      });
    } catch (error) {
      loggerService.error('Error updating quote', {
        error,
        quoteId: id,
        input
      });
      throw error;
    }
  }

  /**
   * Update quote status
   */
  public async updateStatus(id: number, input: UpdateQuoteStatusInput & { rejectReason?: string }) {
    try {
      const quote = await prisma.quote.update({
        where: { id },
        data: {
          status: input.status,
          actionBy: input.actionBy,
          additionalNotes: input.rejectReason,
          updatedAt: new Date()
        },
        include: {
          quoteItems: true
        }
      });

      return this.formatQuoteResponse(quote);
    } catch (error) {
      loggerService.error('Error updating quote status', {
        error,
        quoteId: id,
        input
      });
      throw error;
    }
  }

  /**
   * Delete a quote and its items
   */
  public async delete(id: number) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Delete quote items first
        await tx.quoteItem.deleteMany({
          where: { quoteId: id }
        });

        // Delete the quote
        return await tx.quote.delete({
          where: { id }
        });
      });
    } catch (error) {
      loggerService.error('Error deleting quote', {
        error,
        quoteId: id
      });
      throw error;
    }
  }







  /**
   * Approve a quote and create an approval note
   */
  public async approveQuote(params: ApproveQuoteRequest) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Update quote status to Approved
        const quote = await tx.quote.update({
          where: { id: params.quoteId },
          data: {
            status: QuoteStatus.APPROVED,
            actionBy: params.customerId,
            updatedAt: new Date(),
            ...(params.approveNote && {
              notes: {
                create: {
                  noteType: QuoteNoteType.APPROVED,
                  noteContent: params.approveNote,
                  createdBy: params.customerId
                }
              }
            })
          },
          include: {
            quoteItems: {
              orderBy: {
                id: 'asc'
              }
            },
            notes: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        });

        return this.formatQuoteResponse(quote);
      });
    } catch (error) {
      loggerService.error('Error approving quote', {
        error,
        params
      });
      throw error;
    }
  }

  /**
   * Reject a quote and create a rejection note
   */
  public async rejectQuote(params: RejectQuoteRequest) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Update quote status to DECLINED
        const quote = await tx.quote.update({
          where: { id: params.quoteId },
          data: {
            status: QuoteStatus.DECLINED,
            actionBy: params.customerId,
            updatedAt: new Date(),
            ...(params.rejectNote && {
              notes: {
                create: {
                  noteType: QuoteNoteType.DECLINED,
                  noteContent: params.rejectNote,
                  createdBy: params.customerId
                }
              }
            })
          },
          include: {
            quoteItems: {
              orderBy: {
                id: 'asc'
              }
            },
            notes: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        });

        return this.formatQuoteResponse(quote);
      });
    } catch (error) {
      loggerService.error('Error rejecting quote', {
        error,
        params
      });
      throw error;
    }
  }

  /**
   * Get quote by ID
   */
  public async getQuoteById(params: QuoteDetailsRequest) {
    try {
      const whereCondition = {
        id: params.quoteId,
        storeName: params.storeName,
      } as any;

      if (params.companyLocationId) {
        whereCondition.companyLocationId = params.companyLocationId;
      }

      const quote = await prisma.quote.findFirst({
        where: whereCondition,
        include: {
          quoteItems: {
            orderBy: {
              id: 'asc'
            }
          },
          notes: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!quote) {
        throw QuoteError.notFound(params.quoteId);
      }

      return this.formatQuoteResponse(quote);
    } catch (error) {
      loggerService.error('Error getting quote by ID', {
        error,
        params
      });
      throw error;
    }
  }

  /**
   * Format quote response to handle Prisma Decimal type and include notes
   */
  private formatQuoteResponse(quote: any) {
    return {
      ...quote,
      subtotal: Number(quote.subtotal),
      quoteItems: quote.quoteItems.map((item: any) => ({
        ...item,
        originalPrice: Number(item.originalPrice),
        offerPrice: Number(item.offerPrice)
      })),
      itemCount: quote.quoteItems.length,
      notes: quote.notes || []
    };
  }

  /**
   * Bulk delete quotes
   */
  public async bulkDelete(params: BulkDeleteQuotesRequest) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Delete quote items first
        await tx.quoteItem.deleteMany({
          where: {
            quoteId: {
              in: params.quoteIds
            }
          }
        });

        // Delete quotes (QuoteNotes will be deleted automatically due to CASCADE)
        const result = await tx.quote.deleteMany({
          where: {
            id: {
              in: params.quoteIds
            },
            storeName: params.storeName,
            companyLocationId: params.companyLocationId,
            customerId: params.customerId
          }
        });

        return result.count;
      });
    } catch (error) {
      loggerService.error('Error bulk deleting quotes', {
        error,
        params
      });
      throw error;
    }
  }

  /**
   * Update quote items
   */
  public async updateQuoteItems(params: UpdateQuoteItemsRequest) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get existing quote
        const existingQuote = await tx.quote.findFirst({
          where: {
            id: params.quoteId,
            storeName: params.storeName,
            companyLocationId: params.companyLocationId,
          },
          include: {
            quoteItems: true
          }
        });

        if (!existingQuote) {
          throw QuoteError.notFound(params.quoteId);
        }

        // Delete existing items
        await tx.quoteItem.deleteMany({
          where: { quoteId: params.quoteId }
        });

        // Calculate new subtotal
        const subtotal = params.quoteItems.reduce(
          (sum, item) => sum + (item.offerPrice * item.quantity),
          0
        );

        // Process expirationDate if provided
        let expirationDate = undefined;
        if (params.expirationDate) {
          expirationDate = DateUtils.toPrismaDate(params.expirationDate);
          if (expirationDate) {
            loggerService.info('Processed expirationDate for quote update', {
              originalValue: params.expirationDate,
              parsedDate: expirationDate.toISOString()
            });
          } else {
            loggerService.warn('Invalid expirationDate format for quote update', {
              value: params.expirationDate
            });
          }
        }

        // Update quote with new items
        const quote = await tx.quote.update({
          where: { id: params.quoteId },
          data: {
            subtotal,
            updatedAt: new Date(),
            expirationDate: expirationDate,
            poNumber: params.poNumber,
            quoteItems: {
              create: params.quoteItems.map(item => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                originalPrice: item.originalPrice,
                offerPrice: item.offerPrice,
                description: item.description
              }))
            }
          },
          include: {
            quoteItems: {
              orderBy: {
                id: 'asc'
              }
            },
            notes: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        });

        // Update or create note based on whether note.id exists
        if (!_.isEmpty(params.note)) {
          loggerService.info('Processing note', {
            note: params.note
          });

          if (params.note.id) {
            if (params.note.content) {
              // Update existing note
              await tx.quoteNote.update({
                where: {
                  id: params.note.id,
                  quoteId: params.quoteId
                },
                data: {
                  noteContent: params.note.content,
                  updatedAt: new Date()
                }
              });
            } else {
              // Delete the note if content is empty
              await tx.quoteNote.delete({
                where: {
                  id: params.note.id,
                  quoteId: params.quoteId
                }
              });
            }
          } else {
            // Create new note
            await tx.quoteNote.create({
              data: {
                quoteId: params.quoteId,
                noteType: QuoteNoteType.SUBMITTED,
                noteContent: params?.note?.content || '',
                createdBy: params.customerId || 'SYSTEM',
              }
            });
          }
        }

        return this.formatQuoteResponse(quote);
      });
    } catch (error) {
      loggerService.error('Error updating quote items', {
        error,
        params
      });
      throw error;
    }
  }

  /**
   * Cancel a quote and create a cancellation note
   */
  public async cancelQuote(params: CancelQuoteRequest) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Update quote status to CANCELLED
        const updateData: any = {
          status: QuoteStatus.CANCELLED,
          actionBy: params.customerId,
          updatedAt: new Date()
        };

        if (!_.isEmpty(params.cancelNote)) {
          updateData.notes = {
            create: {
              noteType: QuoteNoteType.CANCELLED,
              noteContent: params.cancelNote,
              createdBy: params.customerId
            }
          };
        }

        const quote = await tx.quote.update({
          where: { id: params.quoteId },
          data: updateData,
          include: {
            quoteItems: {
              orderBy: {
                id: 'asc'
              }
            },
            notes: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        });

        return this.formatQuoteResponse(quote);
      });
    } catch (error) {
      loggerService.error('Error cancelling quote', {
        error,
        params
      });
      throw error;
    }
  }



  /**
   * Find many quotes based on where conditions
   */
  public async findMany(params: {
    where: any;
    select?: any;
  }) {
    try {
      const quotes = await prisma.quote.findMany({
        where: params.where,
        select: params.select
      });

      return quotes;
    } catch (error) {
      loggerService.error('Error finding quotes with conditions', {
        error,
        params
      });
      throw error;
    }
  }

  /**
   * Update many quotes based on where conditions
   */
  public async updateMany(params: {
    where: any;
    data: any;
  }) {
    try {
      const result = await prisma.quote.updateMany({
        where: params.where,
        data: params.data
      });

      return result;
    } catch (error) {
      loggerService.error('Error updating quotes with conditions', {
        error,
        params
      });
      throw error;
    }
  }

  /**
   * Create multiple quote notes
   */
  public async createNotes(notes: Array<{
    quoteId: number;
    note: string;
    createdAt: Date;
    updatedAt: Date;
  }>) {
    try {
      return await prisma.quoteNote.createMany({
        data: notes.map(note => ({
          quoteId: note.quoteId,
          noteType: QuoteNoteType.EXPIRED,
          noteContent: note.note,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          createdBy: 'SYSTEM'
        }))
      });
    } catch (error) {
      loggerService.error('Error creating quote notes', {
        error,
        notes
      });
      throw error;
    }
  }

  /**
   * Convert quote to order and save note
   */
  public async convertQuoteToOrder(params: {
    quoteId: number;
    storeName: string;
    companyLocationId: string;
    customerId: string;
    note?: string;
    actionBy: string;
    status: typeof QuoteStatus[keyof typeof QuoteStatus];
  }): Promise<void> {
    const { quoteId, note, actionBy, status } = params;

    // Use transaction to ensure both operations succeed or fail together
    await prisma.$transaction(async (prisma) => {
      // Update quote status
      await prisma.quote.update({
        where: { id: quoteId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });

      // Create note if provided
      if (typeof note === 'string' && note.trim()) {
        loggerService.info('Creating note', {
          note: note
        });
        await prisma.quoteNote.create({
          data: {
            quoteId,
            noteContent: note,
            noteType: QuoteNoteType.ORDERED,
            createdBy: actionBy,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
    });
  }
}

export const quoteRepository = new QuoteRepository();