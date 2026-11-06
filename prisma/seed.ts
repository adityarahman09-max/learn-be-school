import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const directUrl = process.env.DIRECT_URL;
if (!directUrl) throw new Error("DIRECT_URL is missing in .env");

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: directUrl }),
});

const sampleRecipes = [
    {
        title: "Nasi Goreng Kampung",
        description: "Simple fried rice with basic spices.",
        cooking_time: 20,
        serving: 2,
        difficulty: "Easy",
    },
    {
        title: "Chicken Soto",
        description: "Clear broth with shredded chicken.",
        cooking_time: 45,
        serving: 4,
        difficulty: "Medium",
    },
    {
        title: "Veggie Omelet",
        description: "Eggs with carrot and scallions.",
        cooking_time: 15,
        serving: 1,
        difficulty: "Easy",
    },
];

async function main() {
    await prisma.recipe.deleteMany();
    const result = await prisma.recipe.createMany({ data: sampleRecipes });
    console.log("Seed done:", result.count, "recipes inserted");
}

main()
    .catch((e) => {
        console.error("Seed failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());