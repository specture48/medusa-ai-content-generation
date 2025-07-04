import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import AIContentGenService, {
  GeneratedContent,
} from "../../../modules/content-generator/service";
import { CONTENT_GENERATOR_MODULE } from "../../../modules/content-generator";
import { IProductModuleService } from "@medusajs/types";
import { Modules } from "@medusajs/utils";

interface AdminGenerateFromTitleRequestBody {
  title: string;
  include_variants?: boolean;
  region?: string;
  category_id?: string;
}

export const POST = async (
  req: MedusaRequest<AdminGenerateFromTitleRequestBody>,
  res: MedusaResponse<{ product: GeneratedContent } | { error: string }>,
) => {
  const aiContentGenService = req.scope.resolve<AIContentGenService>(
    CONTENT_GENERATOR_MODULE,
  );

  const { title, include_variants, region, category_id } = req.body;

  if (!title) {
    return res.status(400).json({ error: "title is required" });
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
    }
  }

  try {
    const productContent = await aiContentGenService.generateFromTitle({
      title,
      include_variants,
      region,
      category_name,
    });

    if (productContent) {
      return res.status(200).json({ product: productContent });
    } else {
      // This case should ideally be handled by errors thrown from the service
      return res
        .status(500)
        .json({ error: "Failed to generate content from title" });
    }
  } catch (error) {
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    req.scope
      .resolve("logger")
      .error(
        `[AI Content Gen] Error generating from title: ${errorMessage}`,
        error,
      );
    return res
      .status(500)
      .json({ error: `Failed to generate content: ${errorMessage}` });
  }
};
