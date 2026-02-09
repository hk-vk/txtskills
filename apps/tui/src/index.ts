import { createCliRenderer, TextRenderable } from "@opentui/core";

const renderer = createCliRenderer();

const title = new TextRenderable(renderer, {
    id: "title",
    content: "🎯 txtskills TUI — Coming Soon!",
});

renderer.render();
