import prisma from '~/db.server';

/**
 * Repository class for managing selling plan lines
 */
export class SellingPlanLineRepository {


  
  /**
   * Find all lines associated with a selling plan
   * @param sellingPlanId The ID of the selling plan
   */
  public async findBySellingPlanId(sellingPlanId: number): Promise<any[]> {
    return await prisma.sellingPlanLine.findMany({
      where: { sellingPlanId: BigInt(sellingPlanId) }
    });
  }

  /**
   * Count lines associated with a selling plan
   * @param where Query conditions
   */
  public async count(params: { where: { sellingPlanId: bigint } }): Promise<number> {
    return await prisma.sellingPlanLine.count({
      where: params.where
    });
  }
}

export const sellingPlanLineRepository = new SellingPlanLineRepository(); 