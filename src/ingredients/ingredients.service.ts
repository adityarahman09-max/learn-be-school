import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseStorageService } from '../supabase-storage/supabase-storage.service.js';

@Injectable()
export class IngredientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  checkingFile(file: Express.Multer.File) {
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException(`file should be less than 2 MB`);
    }
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type`);
    }
  }

  async create(
    createIngredientDto: CreateIngredientDto,
    file: Express.Multer.File,
  ) {
    /**check if user uploading file */
    let filePath: string | undefined = undefined;
    if (file) {
      /** checking file before uploading */
      this.checkingFile(file);
      // get Time() as unique prefix of file name
      /**define object path to save file (include file name) */
      filePath = `/ingredients/${new Date().getTime()}-${file.originalname}`;
      /**uploading file */
      (await this.storage.uploadFile(file, filePath)).path;
    }
    const { recipe_id, name, qty, unit } = createIngredientDto;

    const id_exist = await this.prisma.recipe.findFirst({
      where: { id: recipe_id },
    });
    if (!id_exist) {
      throw new NotFoundException('Recipe ID not Exist');
    }

    await this.prisma.ingredient.create({
      data: {
        recipe_id,
        name,
        qty,
        unit,
        imagePath: filePath !== `` ? filePath : undefined,
      },
    });
    return {
      message: `new ingredients has been created`,
    };
  }

  async findAll() {
    const ingredients = await this.prisma.ingredient.findMany();

    return {
      message: ' Ingredients has been loaded',
      data: ingredients.map((item) => {
        return {
          ...item,
          imagePath:
            item.imagePath && item.imagePath !== ''
              ? this.storage.getPublicUrl(item.imagePath)
              : null,
        };
      }),
    };
  }

  async findOne(id: number) {
    const ingredients = await this.prisma.ingredient.findFirst({
      where: { id },
    });

    if (!ingredients) {
      throw new NotFoundException(`Ingredients not found`);
    }
    return {
      message: `Ingredients has found`,
      data: {
        ...ingredients,
        imagePath:
          ingredients.imagePath && ingredients.imagePath !== ''
            ? this.storage.getPublicUrl(ingredients.imagePath)
            : null,
      },
    };
  }

  async update(
    id: number,
    updateIngredientDto: UpdateIngredientDto,
    file?: Express.Multer.File,
  ) {
    /** before update we should check
     * that selected ingredients alredy exist
     */
    const ingredientsExist = await this.prisma.ingredient.findFirst({
      where: { id },
    });
    /** handle if selected ingredients was not found */

    if (!ingredientsExist) {
      throw new NotFoundException(`Ingredients not found`);
    }
    
    /** store current file path */
    let filePath = ingredientsExist.imagePath;

    if (file) {
      /** checking file before uploading */
      this.checkingFile(file);

      /* ensure that old file already exist */
      if (ingredientsExist.imagePath && ingredientsExist.imagePath !== '') {
        const checkOldFile = await this.storage.fileExists(
          ingredientsExist.imagePath || '',
        );

        if (checkOldFile) {
          await this.storage.deleteFile(ingredientsExist.imagePath || '');
        }
      }

      /** Renew file path */
      filePath = `/ingredients/${new Date().getTime()}-${file.originalname}`;

      /** upload new file */
      await this.storage.uploadFile(file, filePath);
    }

    /** grab request data from DTO */

    if (updateIngredientDto.recipe_id) {
      const selectedRecipe = await this.prisma.recipe.findFirst({
        where: { id: updateIngredientDto.recipe_id },
      });
      if (!selectedRecipe) {
        throw new NotFoundException(' Recipe not found');
      }
    }

    const ingredientsUpdate = await this.prisma.ingredient.update({
      where: { id },
      data: updateIngredientDto,
    });
    return {
      message: `Ingredients Update`,
      data: updateIngredientDto,
    };
  }

  async remove(id: number) {
    const selecetedIngredients = await this.prisma.ingredient.findFirst({
      where: { id },
    });
    if (!selecetedIngredients) {
      throw new NotFoundException('Ingredients Not Found');
    }
    const checkOldFile = await this.storage.fileExists(
      selecetedIngredients?.imagePath || '',
    );

    if (checkOldFile) {
      await this.storage.deleteFile(selecetedIngredients?.imagePath || '');
    }

    const deletedIngredients = await this.prisma.ingredient.delete({
      where: { id },
    });

    return {
      message: `Ingredients has remove`,
      data: selecetedIngredients,
    };
  }
}
