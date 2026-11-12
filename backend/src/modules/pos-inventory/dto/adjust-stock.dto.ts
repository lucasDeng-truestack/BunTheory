import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * Change a stock count from the inventory screen.
 * - mode "add" (default): `amount` is added; negative takes stock away (waste, staff meal).
 * - mode "set": `amount` is the new count after a physical count.
 * Applied on the server as a change plus a movement row, so it never overwrites
 * a kitchen deduction that happened while the screen was open.
 */
export class AdjustStockDto {
  @IsOptional()
  @IsIn(['add', 'set'])
  mode?: 'add' | 'set';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-100000)
  @Max(100000)
  amount: number;
}
