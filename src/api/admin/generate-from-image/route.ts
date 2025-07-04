import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import AIContentGenService, {
  GeneratedContent,
} from "../../../modules/content-generator/service";
import { CONTENT_GENERATOR_MODULE } from "../../../modules/content-generator";
import { IProductModuleService, MedusaContainer } from "@medusajs/types";
import { Modules } from "@medusajs/utils";

// Define a more specific request type if possible, or use MedusaRequest<any>
// For now, let's assume the body will match GenerateFromImageOptions
interface AdminGenerateFromImageRequestBody {
  image_url: string;
  include_variants?: boolean;
  region?: string;
  category_id?: string;
}

export const POST = async (
  req: MedusaRequest<AdminGenerateFromImageRequestBody>,
  res: MedusaResponse<{ product: GeneratedContent } | { error: string }>,
) => {
  const aiContentGenService = req.scope.resolve<AIContentGenService>(
    CONTENT_GENERATOR_MODULE,
  );

  const { image_url, include_variants, region, category_id } = req.body;

  if (!image_url) {
    return res.status(400).json({ error: "image_url is required" });
  }

  let category_name: string | undefined = undefined;
  if (category_id) {
    try {
      const productModuleService = req.scope.resolve<IProductModuleService>(
        Modules.PRODUCT,
      );
      const category = await productModuleService.retrieveProductCategory(
        category_id,
        { select: ["name"] },
      );
      category_name = category.name;
    } catch (error) {
      req.scope
        .resolve("logger")
        .warn(
          `[AI Content Gen] Failed to retrieve category ${category_id}: ${error.message}`,
        );
      // Decide if we should fail or proceed without the category name.
      // For now, let's proceed without it.
    }
  }

  try {
    const productContent = await aiContentGenService.generateFromImage({
      image_url,
      include_variants,
      region,
      category_name,
    });

    if (productContent) {
      return res.status(200).json({ product: productContent });
    } else {
      return res
        .status(500)
        .json({ error: "Failed to generate content from image" });
    }
  } catch (error) {
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Log the detailed error on the server
    req.scope
      .resolve("logger")
      .error(
        `[AI Content Gen] Error generating from image: ${errorMessage}`,
        error,
      );
    return res
      .status(500)
      .json({ error: `Failed to generate content: ${errorMessage}` });
  }
};
