import { Module } from "@medusajs/framework/utils";
import AIContentGenService from "./service";

export const CONTENT_GENERATOR_MODULE = "content_generator";

export default Module(CONTENT_GENERATOR_MODULE, {
  service: AIContentGenService,
});
