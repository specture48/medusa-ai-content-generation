import { Logger, MedusaContainer } from "@medusajs/medusa";
import OpenAI from "openai";
import { MedusaError } from "@medusajs/framework/utils";

export interface AIContentGenPluginOptions {
  deepseek_api_key?: string;
  deepseek_model_name?: string;
  openai_api_key?: string;
  openai_model_name?: string;
}

export interface GenerateFromImageOptions {
  image_url: string;
  include_variants?: boolean;
  region?: string;
  category_name?: string;
}

export interface GenerateFromTitleOptions {
  title: string;
  include_variants?: boolean;
  region?: string;
  category_name?: string;
}

export interface GenerateContentOptions {
  category_name?: string;
  region?: string;
}

export interface GeneratedContent {
  title: string;
  subtitle: string | null;
  description: string | null;
  handle: string | null;
  is_giftcard: boolean;
  discountable: boolean;
  status: "draft" | "proposed" | "published" | "rejected";
  images: Array<{ url: string }>;
  thumbnail: string | null;
  tags: Array<{ value: string }>;
  type: { value: string } | null;
  options: Array<{
    title: string;
    values: string[];
  }>;
  variants: Array<{
    title: string;
    sku: string | null;
    ean: string | null;
    upc: string | null;
    barcode: string | null;
    hs_code: string | null;
    inventory_quantity: number;
    allow_backorder: boolean;
    manage_inventory: boolean;
    weight: number | null;
    length: number | null;
    height: number | null;
    width: number | null;
    origin_country: string | null;
    mid_code: string | null;
    material: string | null;
    metadata: Record<string, unknown> | null;
  }>;
  weight: number | null;
  length: number | null;
  height: number | null;
  width: number | null;
  hs_code: string | null;
  origin_country: string | null;
  mid_code: string | null;
  material: string | null;
  metadata: Record<string, unknown> | null;
}

type InjectedDependencies = {
  logger: Logger;
};

class AIContentGenService {
  protected readonly deepseekApiKey_?: string;
  protected readonly deepseekModelName_?: string;
  protected readonly deepseekClient_?: OpenAI;
  protected readonly openaiApiKey_?: string;
  protected readonly openaiModelName_?: string;
  protected readonly openaiClient_?: OpenAI;
  protected readonly logger_: Logger;

  constructor(
    { logger }: InjectedDependencies,
    options: AIContentGenPluginOptions,
  ) {
    this.logger_ = logger;

    // DeepSeek Configuration
    this.deepseekApiKey_ = options.deepseek_api_key;
    this.deepseekModelName_ = options.deepseek_model_name || "deepseek-chat";
    if (!this.deepseekApiKey_) {
      this.logger_.warn(
        "DeepSeek API Key is not configured for ai-content-gen. Text-based generation will be disabled.",
      );
    } else {
      this.deepseekClient_ = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: this.deepseekApiKey_,
      });
    }

    // OpenAI Configuration
    this.openaiApiKey_ = options.openai_api_key;
    this.openaiModelName_ = options.openai_model_name || "gpt-4o";
    if (!this.openaiApiKey_) {
      this.logger_.warn(
        "OpenAI API Key is not configured for ai-content-gen. Image-based generation will be disabled.",
      );
    } else {
      this.openaiClient_ = new OpenAI({
        apiKey: this.openaiApiKey_,
      });
    }
  }

  private getSystemPrompt(
    task: "image" | "title" | "full_generation" = "full_generation",
  ): string {
    if (task === "image") {
      return "You are an expert e-commerce copywriter and product specialist. Your task is to analyze product images and generate complete, accurate product listings with all necessary details.";
    }
    if (task === "title") {
      return "You are an expert e-commerce copywriter and product specialist. Your task is to take a given product title and generate a complete, compelling product listing with all necessary details based on that title.";
    }
    return "You are an expert e-commerce copywriter and product specialist. Your task is to generate a complete, creative product listing including all necessary details. Create a compelling, market-ready product with all required fields.";
  }

  private getImageAnalysisPrompt(options: GenerateFromImageOptions): string {
    const variantText = options.include_variants
      ? "\\n- Generate appropriate product variants with realistic attributes and inventory settings."
      : "\\n- Focus on the main product attributes without creating variants.";

    const regionText = options.region
      ? `\\n\\nTarget Region: ${options.region}\\n- Ensure all content is appropriate for the ${options.region} market.`
      : "";

    const categoryText = options.category_name
      ? `\\n\\nProduct Category: ${options.category_name}\\n- Use this category as a strong hint for the product type, tags, and especially for generating relevant variants. For example, if the category is 'footwear', generate shoe sizes. If it's 'apparel', generate clothing sizes.`
      : "";

    return `**Objective:** Analyze the provided product image and create a complete, market-ready product listing.

**Task:** Examine the image carefully and generate a detailed product listing that:
- Accurately describes what you see in the image.
- Creates appropriate product categories and tags.
- Includes realistic physical attributes and measurements.
- Generates SEO-friendly content.${variantText}${regionText}${categoryText}

**Required Response Format:**
Respond with a JSON object containing all product fields. Ensure the "images" and "thumbnail" fields use the provided image URL: ${options.image_url}`;
  }

  private getTitleBasedPrompt(options: GenerateFromTitleOptions): string {
    const variantText = options.include_variants
      ? "\n- Generate appropriate product variants with realistic attributes and inventory settings, derived logically from the title and common product configurations."
      : "\n- Focus on the main product attributes without creating variants.";

    const regionText = options.region
      ? `\n\nTarget Region: ${options.region}\n- Ensure all content is appropriate for the ${options.region} market\n- Use relevant sizing standards for ${options.region}\n- Consider regional preferences and regulations of ${options.region}`
      : "";

    const categoryText = options.category_name
      ? `\n\nProduct Category: ${options.category_name}\n- Use this category as a strong hint for the product type, tags, and especially for generating relevant variants. For example, if the category is 'footwear', generate shoe sizes (e.g., US 8, 9, 10). If it's 'apparel', generate clothing sizes (e.g., S, M, L, XL). The generated options and variants should reflect common configurations for products in this category.`
      : "";

    return `**Objective:** Based on the product title "${options.title}", generate a complete and compelling product listing with all necessary details.
${regionText}${categoryText}

**Task:**
- Use the provided title "${options.title}" as the exact title for the product.
- Elaborate on this title to create a suitable subtitle and detailed product description.
- Generate a relevant, URL-friendly handle based on the title.
- Create appropriate product tags and a product type that align with the title.
- Infer and generate realistic physical attributes (weight, dimensions), materials, and other product details that would typically be associated with a product having this title.
${variantText}

**Guidelines for Content Generation:**
1. **Title Adherence:** The output JSON's "title" field MUST be exactly "${options.title}".
2. **Content Expansion:** Creatively and logically expand on the given title to fill all other product fields.
3. **Realism & Marketability:** Ensure the generated content describes a realistic and marketable product.
4. **SEO & Discoverability:** Optimize generated text (description, handle, tags) for search engines.

**Required Response Format:**
Respond with a single, valid JSON object containing all product fields, ensuring the "title" field is exactly "${options.title}". The structure of your response must match this example precisely:
\`\`\`json
{
  "title": "${options.title}",
  "subtitle": "A compelling subtitle derived from the main title.",
  "description": "A detailed, persuasive, and SEO-friendly product description based on the title. It should highlight key features and benefits.",
  "handle": "a-url-friendly-handle-based-on-the-title",
  "is_giftcard": false,
  "discountable": true,
  "status": "draft",
  "images": [],
  "thumbnail": null,
  "tags": [
    { "value": "tag-one" },
    { "value": "tag-two" }
  ],
  "type": { "value": "Product Type" },
  "options": [
    {
      "title": "Size",
      "values": ["S", "M", "L"]
    }
  ],
  "variants": [
    {
      "title": "S",
      "sku": "SKU-S",
      "ean": null,
      "upc": null,
      "barcode": null,
      "hs_code": null,
      "inventory_quantity": 10,
      "allow_backorder": false,
      "manage_inventory": true,
      "weight": null,
      "length": null,
      "height": null,
      "width": null,
      "origin_country": null,
      "mid_code": null,
      "material": null,
      "metadata": {}
    }
  ],
  "weight": null,
  "length": null,
  "height": null,
  "width": null,
  "hs_code": null,
  "origin_country": null,
  "mid_code": null,
  "material": null,
  "metadata": {}
}
\`\`\`

Now, generate comprehensive and market-ready content starting from the provided title.`;
  }

  async generateFromImage(
    options: GenerateFromImageOptions,
  ): Promise<GeneratedContent | null> {
    this.logger_.info(
      "AIContentGenService: Generating product content from image using OpenAI",
    );

    if (!this.openaiClient_ || !this.openaiApiKey_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "OpenAI client or API key is not configured for image generation.",
      );
    }

    try {
      const completion = await this.openaiClient_.chat.completions.create({
        model: this.openaiModelName_!,
        messages: [
          { role: "system", content: this.getSystemPrompt("image") },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: this.getImageAnalysisPrompt(options),
              },
              {
                type: "image_url",
                image_url: {
                  url: options.image_url,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
        temperature: 0.2,
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        try {
          const parsedResponse = JSON.parse(response) as GeneratedContent;
          if (
            typeof parsedResponse.title === "string" &&
            (!options.include_variants ||
              Array.isArray(parsedResponse.variants))
          ) {
            this.logger_.info(
              `AIContentGenService (OpenAI): Successfully generated content from image for product: "${parsedResponse.title}"`,
            );
            return parsedResponse;
          }
        } catch (parseError) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Failed to parse JSON response from OpenAI: ${parseError}`,
          );
        }
      }

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Invalid response structure or empty content from OpenAI. Response: ${response || "No content"}`,
      );
    } catch (error) {
      if (error instanceof MedusaError) {
        throw error;
      }
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Error calling OpenAI API: ${error instanceof OpenAI.APIError ? error.message : error}`,
      );
    }
  }

  async generateFromTitle(
    options: GenerateFromTitleOptions,
  ): Promise<GeneratedContent | null> {
    this.logger_.info(
      `AIContentGenService: Generating product content from title using DeepSeek: "${options.title}"`,
    );

    if (!this.deepseekClient_ || !this.deepseekApiKey_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "DeepSeek client or API key is not configured for text generation.",
      );
    }

    try {
      const prompt = this.getTitleBasedPrompt(options);
      const completion = await this.deepseekClient_.chat.completions.create({
        model: this.deepseekModelName_!,
        messages: [
          { role: "system", content: this.getSystemPrompt("title") },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
        temperature: 0.7,
      });

      this.logger_.debug(
        `DeepSeek raw completion object for title generation: ${JSON.stringify(
          completion,
          null,
          2,
        )}`,
      );

      const choice = completion.choices[0];
      const response = choice?.message?.content;
      if (response) {
        try {
          const parsedResponse = JSON.parse(response) as GeneratedContent;
          if (parsedResponse.title !== options.title) {
            this.logger_.warn(
              `AI generated title "${parsedResponse.title}" does not match requested title "${options.title}". Overriding with requested title.`,
            );
            parsedResponse.title = options.title;
          }

          if (
            typeof parsedResponse.title === "string" && // Should always be true now
            (!options.include_variants ||
              Array.isArray(parsedResponse.variants))
          ) {
            this.logger_.info(
              `AIContentGenService (DeepSeek): Successfully generated content from title for product: "${parsedResponse.title}"`,
            );
            return parsedResponse;
          }
        } catch (parseError) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Failed to parse JSON response from DeepSeek: ${parseError}`,
          );
        }
      }

      const finish_reason = choice?.finish_reason || "unknown";
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Invalid response structure or empty content from DeepSeek. Finish reason: ${finish_reason}. Response: ${
          response || "No content"
        }`,
      );
    } catch (error) {
      if (error instanceof MedusaError) {
        throw error;
      }
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Error calling DeepSeek API: ${error instanceof OpenAI.APIError ? error.message : error}`,
      );
    }
  }

  private getBasePrompt(options: GenerateContentOptions = {}): string {
    const categoryText = options.category_name
      ? `\n\n**Product Category Constraint:**\nThe generated product MUST belong to the '${options.category_name}' category. All generated details, including title, description, tags, type, options, and variants, must be appropriate for this category. For example, if the category is 'footwear', generate shoe sizes. If it's 'apparel', create clothing sizes.`
      : "";

    const regionText = options.region
      ? `\n\n**Target Region:**\nAll generated content must be optimized and appropriate for the ${options.region} market. Consider local language, culture, and sizing standards.`
      : "";

    return `**Objective:** Create a complete, market-ready product listing with all necessary content and metadata.${categoryText}${regionText}

**Task:** Generate a creative, realistic product listing that could be sold in an e-commerce store. The product should be:
- Marketable and appealing to customers
- Properly categorized and organized
- Complete with all necessary variants and options
- Ready for inventory management
- Optimized for SEO and discoverability

**Guidelines for Content Generation:**
1. **Core Product Information:**
   - Create an attention-grabbing title (50-70 chars)
   - Write a compelling subtitle
   - Craft a detailed, persuasive product description
   - Generate a SEO-friendly handle/slug
   - Set appropriate product status (default: draft)

2. **Product Organization:**
   - Define a logical product type
   - Add relevant searchable tags
   - Create appropriate product options (e.g., size, color)
   - Generate realistic variants based on options

3. **Product Details:**
   - Include realistic physical attributes
   - Specify materials used
   - Set appropriate country of origin
   - Add relevant HS codes for shipping
   - Configure sensible inventory settings

4. **E-commerce Settings:**
   - Set appropriate gift card status
   - Configure discountable settings
   - Set realistic inventory quantities
   - Configure variant-specific details

**Required ResponseFormat:**
Respond with a JSON object containing all product fields as shown in this example:
\`\`\`json
{
  "title": "Premium Cotton Crew Neck T-Shirt",
  "subtitle": "Comfortable, Durable, Everyday Essential",
  "description": "Experience ultimate comfort with our premium cotton crew neck t-shirt...",
  "handle": "premium-cotton-crew-neck-tshirt",
  "is_giftcard": false,
  "discountable": true,
  "status": "draft",
  "images": [{ "url": "placeholder-tshirt-image.jpg" }],
  "thumbnail": "placeholder-tshirt-thumb.jpg",
  "tags": [
    { "value": "apparel" },
    { "value": "essentials" },
    { "value": "cotton" }
  ],
  "type": { "value": "clothing" },
  "options": [
    {
      "title": "Size",
      "values": ["S", "M", "L", "XL"]
    },
    {
      "title": "Color",
      "values": ["Black", "White", "Navy"]
    }
  ],
  "variants": [
    {
      "title": "Small Black T-Shirt",
      "sku": "TCN-BLK-S",
      "ean": null,
      "upc": null,
      "barcode": null,
      "hs_code": "6109.10",
      "inventory_quantity": 50,
      "allow_backorder": false,
      "manage_inventory": true,
      "weight": 200,
      "length": 30,
      "height": 5,
      "width": 20,
      "origin_country": "US",
      "mid_code": null,
      "material": "100% Cotton",
      "metadata": {
        "care_instructions": "Machine wash cold, tumble dry low"
      }
    }
  ],
  "weight": null,
  "length": null,
  "height": null,
  "width": null,
  "hs_code": "6109.10",
  "origin_country": "US",
  "mid_code": null,
  "material": "100% Cotton",
  "metadata": {
    "collection": "Essentials",
    "season": "All-year"
  }
}
\`\`\`

Be creative but realistic. Generate a complete product that would be viable in a real e-commerce store.`;
  }

  async generateContent(
    options: GenerateContentOptions = {},
  ): Promise<GeneratedContent | null> {
    this.logger_.info("AIContentGenService: Generating new product content");

    if (!this.deepseekClient_ || !this.deepseekApiKey_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "DeepSeek client or API key is not initialized",
      );
    }

    try {
      const completion = await this.deepseekClient_.chat.completions.create({
        model: this.deepseekModelName_!,
        messages: [
          { role: "system", content: this.getSystemPrompt("full_generation") },
          { role: "user", content: this.getBasePrompt(options) },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
        temperature: 0.7,
      });

      this.logger_.debug(
        `DeepSeek raw completion object for full generation: ${JSON.stringify(
          completion,
          null,
          2,
        )}`,
      );

      const choice = completion.choices[0];
      const response = choice?.message?.content;
      if (response) {
        try {
          const parsedResponse = JSON.parse(response) as GeneratedContent;
          if (
            Array.isArray(parsedResponse.options) &&
            Array.isArray(parsedResponse.variants)
          ) {
            this.logger_.info(
              `AIContentGenService: Successfully generated content for product: "${parsedResponse.title}"`,
            );
            return parsedResponse;
          }
        } catch (parseError) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Failed to parse JSON response: ${parseError}`,
          );
        }
      }

      const finish_reason = choice?.finish_reason || "unknown";
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Invalid response structure or empty content from DeepSeek. Finish reason: ${finish_reason}. Response: ${
          response || "No content"
        }`,
      );
    } catch (error) {
      if (error instanceof MedusaError) {
        throw error;
      }
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Error calling DeepSeek API: ${error instanceof OpenAI.APIError ? error.message : error}`,
      );
    }
  }
}

export default AIContentGenService;
