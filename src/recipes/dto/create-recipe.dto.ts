import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator"

export class CreateRecipeDto {
    @IsNotEmpty()
    @IsString()
    title!: string
    @IsOptional()
    @IsString()
    description?: string
    @IsNotEmpty()
    @IsInt()
    @IsPositive()
    cooking_time!: number
    @IsNotEmpty()
    @IsInt()
    @IsPositive()
    serving!: number
    @IsNotEmpty()
    @IsString()
    @IsIn(["easy", "medium", "hard"])
    difficulty!: string
}