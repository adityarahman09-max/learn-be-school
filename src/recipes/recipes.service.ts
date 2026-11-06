import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRecipeDto } from './dto/create-recipe.dto.js';
import { UpdateRecipeDto } from './dto/update-recipe.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseStorageService } from '../supabase-storage/supabase-storage.service.js';
import { UndefinedModuleException } from '@nestjs/core/errors/exceptions/undefined-module.exception.js';
import { isNotEmpty } from 'class-validator';
import { iterator } from 'rxjs/internal/symbol/iterator';

@Injectable()
export class RecipesService {
  /**constructor for call prismaService */
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  checkingFile(file: Express.Multer.File) {
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('File Should Be Less than 2 MB');
    }
    const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid File Type');
    }
  }

  async create(createRecipeDto: CreateRecipeDto, file: Express.Multer.File) {
    // check if user uplouding file
    let filePath: string | undefined = undefined;
    if (file) {
      // checking before uplouding file
      this.checkingFile(file);
      // define object path to save file (include file name)
      filePath = `/recipes/${new Date().getTime()}-${file.originalname}`;
      await this.storage.uploadFile(file, filePath);
    }
    /** grab dto */
    const { title, description, serving, cooking_time, difficulty } =
      createRecipeDto;

    /** insert into recipe */
    await this.prisma.recipe.create({
      data: {
        title,
        description,
        serving,
        cooking_time,
        difficulty,
        photoPath: filePath !== `` ? filePath : undefined,
      },
    });
    return {
      message: `new recipe has been created`,
    };
  }

  async findAll() {
    /**async -> asynchronous
     * proses that has possibility for success or failed
     * usualy process from third party
     */

    /**load data from "recipes" table */
    const recipes = await this.prisma.recipe.findMany();
    // select * from recipes; -> findMany/findAll
    return {
      message: `Recipes has been loaded`,
      data: recipes.map((item) => {
        return {
          ...item,
          photoPath:
            item.photoPath && item.photoPath !== ``
              ? this.storage.getPublicUrl(item.photoPath)
              : null,
        };
      }),
    };
  }

  async findOne(id: number) {
    /**get one recepi based on selected ID */
    const recipe = await this.prisma.recipe.findFirst({
      where: { id },
    });
    // select * from recipes where id=?
    if (!recipe) {
      // if selected recipe not found, then
      throw new NotFoundException(`Recipe not found`);
    }
    return {
      message: `Recipe has been loaded`,
      data: {
        ...recipe,
        photoPath:
          recipe.photoPath && recipe.photoPath !== ``
            ? this.storage.getPublicUrl(recipe.photoPath)
            : null,
      },
    };
  }

  async update(
    id: number,
    updateRecipeDto: UpdateRecipeDto,
    file: Express.Multer.File | undefined,
  ) {
    // endsure recipe exsist
    const selectedRecipe = await this.prisma.recipe.findFirst({
      where: { id },
    });
    if (!selectedRecipe) {
      throw new NotFoundException(`Recipe not found`);
    }

    let filePath = selectedRecipe.photoPath;

    if (file) {
      // checking
      this.checkingFile(file);

      if (selectedRecipe.photoPath && selectedRecipe.photoPath !== ``) {
        const checkOldFile = await this.storage.fileExists(
          selectedRecipe.photoPath || ``,
        );

        if (checkOldFile) {
          await this.storage.deleteFile(selectedRecipe.photoPath || ``);
        }
      }

      // renew file path
      filePath = `/recipes/${new Date().getTime()}-${file.originalname}`;

      // uploud new file
      await this.storage.uploadFile(file, filePath);
    }

    // const { title, description, serving, cooking_time, difficulty } =
    //   updateRecipeDto;
    // //proses update
    // await this.prisma.recipe.update({
    //   where: { id },
    //   data: { title, serving, cooking_time, difficulty, description },
    // });
    // return {
    //   massage: `Recipe has update`,
    // };

    const recipeUpdate = await this.prisma.recipe.update({
      where: { id },
      data: {...updateRecipeDto,photoPath: filePath},
    });
    return {
      message: `Recipes Update`,
      data: updateRecipeDto,
    };
  }

  async remove(id: number) {
    const selectedRecipes = await this.prisma.recipe.findFirst({
      where: { id },
    });

    if (!selectedRecipes) {
      throw new NotFoundException(`Recipes Not Found`);
    }
    const checkOldFile = await this.storage.fileExists(
      selectedRecipes?.photoPath || ``,
    );
    if (checkOldFile) {
      await this.storage.deleteFile(selectedRecipes?.photoPath || ``);
    }

    const deletedRecipes = await this.prisma.recipe.delete({
      where: { id },
    });

    return {
      message: `Recipe has Removed`,
      data: selectedRecipes,
    };
  }
}
