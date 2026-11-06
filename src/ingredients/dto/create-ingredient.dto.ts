import { IsIn, IsInt, IsNotEmpty, isNotEmpty, IsNumber, IsPositive, IsString } from "class-validator"

export class CreateIngredientDto {
    @IsNotEmpty()
    @IsPositive()
    @IsInt()
    recipe_id!: number

    @IsNotEmpty()
    @IsString()
    name!: string

    @IsNotEmpty()
    @IsString()
    unit!: string

    @IsNotEmpty()
    @IsPositive()
    @IsInt()
    qty!: number
}
