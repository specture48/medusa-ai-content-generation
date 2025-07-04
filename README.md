# AI Content Generation Plugin for Medusa

## Overview

**AI Content Gen** is a powerful Medusa plugin that leverages state-of-the-art AI (DeepSeek and OpenAI) to automatically generate complete, SEO-friendly product listings for your e-commerce store. It can create product titles, descriptions, variants, and more—either from a product image, a title, or from scratch—saving you time and ensuring high-quality, market-ready content.

---

## Key Features

- **AI-Powered Content Generation:**
  - Generate product listings from images (OpenAI) or titles (DeepSeek).
  - Supports both text and image-based content creation.
- **SEO Optimization:**
  - Produces SEO-friendly titles, handles, and descriptions.
- **Region & Category Awareness:**
  - Prompts can be tailored to specific regions and product categories for localized, relevant content.
- **Highly Configurable:**
  - Choose your AI provider (DeepSeek or OpenAI), models, and prompt templates.
- **API Endpoints:**
  - Admin endpoints for generating content from images or titles.
- **Extensible & Future-Proof:**
  - Designed for easy addition of new AI providers and prompt customization.
- **Robust Error Handling & Logging:**
  - Comprehensive logging and validation for reliable operation.

---

## Use Cases

- **Automate Product Catalog Creation:** Instantly generate detailed product listings for new items.
- **Bulk Content Updates:** Refresh outdated product descriptions or add variants in bulk.
- **Localization:** Generate region-specific content for international stores.
- **SEO Optimization:** Ensure all listings are optimized for search engines.

---

## Installation

1. **Install the plugin and dependencies:**
   ```bash
   yarn add @oneshop/ai-content-gen openai
   # or
   npm install @oneshop/ai-content-gen openai
   ```

2. **Configure the plugin in `medusa-config.js`:**
   ```js
   const plugins = [
     // ...other plugins
     {
       resolve: `@oneshop/ai-content-gen`,
       options: {
         ai_provider: process.env.AI_PROVIDER || 'deepseek', // 'deepseek' or 'openai'
         deepseek_api_key: process.env.DEEPSEEK_API_KEY,
         deepseek_model_name: process.env.DEEPSEEK_MODEL_NAME || 'deepseek-chat',
         openai_api_key: process.env.OPENAI_API_KEY,
         openai_model_name: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
       }
     }
   ]
   ```

3. **Set your API keys and provider in your `.env` file:**
   ```env
   AI_PROVIDER=openai # or deepseek
   DEEPSEEK_API_KEY=your_actual_deepseek_api_key_here
   DEEPSEEK_MODEL_NAME=deepseek-chat
   OPENAI_API_KEY=your_actual_openai_api_key_here
   OPENAI_MODEL_NAME=gpt-4o
   ```

---

## Configuration Options

| Option                         | Type   | Description                                                                                         | Default         |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------- | --------------- |
| `ai_provider`                  | string | The AI provider to use. Enum: `"deepseek"`, `"openai"`.                                              | `"deepseek"`    |
| `deepseek_api_key`             | string | Your API key for the DeepSeek API. Required if `ai_provider` is `"deepseek"`.                      |                 |
| `deepseek_model_name`          | string | The DeepSeek model to use (e.g., 'deepseek-coder', 'deepseek-chat').                               | `"deepseek-chat"` |
| `openai_api_key`               | string | Your API key for the OpenAI API. Required if `ai_provider` is `"openai"`.                           |                 |
| `openai_model_name`            | string | The OpenAI model to use (e.g., 'gpt-4o', 'gpt-3.5-turbo').                                        | `"gpt-4o"`      |

---

## API Usage

### 1. Generate Product Content from Image
- **Endpoint:** `POST /admin/generate-from-image`
- **Body:**
  ```json
  {
    "image_url": "https://example.com/image.jpg",
    "include_variants": true,
    "region": "US",
    "category_id": "cat_123"
  }
  ```
- **Response:**
  ```json
  {
    "product": {
      "title": "...",
      "subtitle": "...",
      "description": "...",
      "handle": "...",
      ...
    }
  }
  ```

### 2. Generate Product Content from Title
- **Endpoint:** `POST /admin/generate-from-title`
- **Body:**
  ```json
  {
    "title": "Premium Cotton T-Shirt",
    "include_variants": true,
    "region": "US",
    "category_id": "cat_123"
  }
  ```
- **Response:**
  ```json
  {
    "product": {
      "title": "Premium Cotton T-Shirt",
      "subtitle": "...",
      "description": "...",
      "handle": "premium-cotton-t-shirt",
      ...
    }
  }
  ```

---

## Technical Highlights

- **Service Layer:** Centralized in `AIContentGenService` for prompt construction, API calls, and response validation.
- **Prompt Engineering:** Prompts are tailored for image or title-based generation, with region and category awareness.
- **Strict Output Validation:** Ensures generated content matches the required product schema.
- **Medusa Integration:** Exposes endpoints for admin use, and can be configured via `medusa-config.js` or `.env`.
- **TypeScript:** Fully typed interfaces for all options and generated content.
- **Logging & Error Handling:** All operations are logged and errors are handled gracefully for reliability.

---

## Best Practices
- Use high-quality images for best results with image-based generation.
- Provide category and region information to improve relevance and localization.
- Review generated content for accuracy and compliance before publishing.
- Rotate API keys and monitor usage for cost control and security.

---

## Extending & Customizing
- **Add More Providers:** The service is designed for easy extension to new AI providers.
- **Custom Prompts:** Use the `default_prompt_template_path` option to supply your own prompt templates.
- **Advanced Workflows:** Integrate with other Medusa plugins or workflows for bulk or scheduled content generation.

---

## License
MIT

---
