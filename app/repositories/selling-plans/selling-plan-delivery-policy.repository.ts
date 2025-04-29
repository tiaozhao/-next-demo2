import { type Prisma } from '@prisma/client';
import prisma from '~/db.server';

export class SellingPlanDeliveryPolicyRepository {
  /**
   * Create a selling plan delivery policy
   */
  public async create(data: {
    sellingPlanId: number;
    offerDiscount: boolean;
    intervalValue: number;
    intervalUnit: string;
    discountType?: string;
    discountValue?: number;
    deliveryAnchor?: number;
    storeName: string;
  }, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx || prisma;
    
    return await db.sellingPlanDeliveryPolicy.create({
      data: {
        sellingPlanId: BigInt(data.sellingPlanId),
        offerDiscount: data.offerDiscount,
        intervalValue: data.intervalValue,
        intervalUnit: data.intervalUnit,
        discountType: data.discountType,
        discountValue: data.discountValue,
        deliveryAnchor: data.deliveryAnchor,
        storeName: data.storeName
      }
    });
  }
  
  /**
   * Create multiple delivery policies for a selling plan
   */
  public async createMany(
    sellingPlanId: number, 
    policies: Array<{
      offerDiscount: boolean;
      intervalValue: number;
      intervalUnit: string;
      discountType?: string;
      discountValue?: number;
      deliveryAnchor?: number;
      storeName: string;
    }>,
    tx?: Prisma.TransactionClient
  ): Promise<any[]> {
    const db = tx || prisma;
    
    const results = await Promise.all(
      policies.map(policy => 
        db.sellingPlanDeliveryPolicy.create({
          data: {
            sellingPlanId: BigInt(sellingPlanId),
            offerDiscount: policy.offerDiscount,
            intervalValue: policy.intervalValue,
            intervalUnit: policy.intervalUnit,
            discountType: policy.discountType,
            discountValue: policy.discountValue,
            deliveryAnchor: policy.deliveryAnchor,
            storeName: policy.storeName
          }
        })
      )
    );
    
    return results;
  }
  
  /**
   * Find delivery policies by selling plan ID
   */
  public async findBySellingPlanId(sellingPlanId: number): Promise<any[]> {
    return await prisma.sellingPlanDeliveryPolicy.findMany({
      where: { sellingPlanId: BigInt(sellingPlanId) }
    });
  }

  /**
   * Find delivery policies with custom where clause
   */
  public async findMany(params: { where: { sellingPlanId: bigint } }): Promise<any[]> {
    return await prisma.sellingPlanDeliveryPolicy.findMany({
      where: params.where
    });
  }
}

export const sellingPlanDeliveryPolicyRepository = new SellingPlanDeliveryPolicyRepository(); 