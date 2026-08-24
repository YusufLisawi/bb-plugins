import "./app.css";
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { mountGeneratedImages } from "./generated-images";
import {
  GENERATED_IMAGES_PANEL_ID,
  GeneratedImagesHeaderBridge,
  GeneratedImagesPanel,
} from "./generated-images-panel";

/**
 * The gallery is a trusted content script because the native conversation
 * timeline currently renders image-generation results as collapsed work.
 * It decorates the assistant's message column after the provider has gone
 * idle, so the image remains part of the conversation view.
 */
export default definePluginApp((app) => {
  app.slots.threadPanelAction({
    id: GENERATED_IMAGES_PANEL_ID,
    title: "Generated images",
    icon: "Image",
    layout: "flush",
    component: GeneratedImagesPanel,
  });

  app.slots.experimental_threadHeaderAction({
    id: "generated-images-panel-bridge",
    title: "Generated images viewer",
    component: GeneratedImagesHeaderBridge,
  });

  app.contentScripts.register({
    id: "generated-images-in-conversation",
    mount: ({ pluginId, signal }) => mountGeneratedImages({ pluginId, signal }),
  });
});
