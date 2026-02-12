class ThemeController {
  constructor() {
    this.root = document.documentElement;
  }

  applyTheme(themeData) {
    if (!themeData) return;

    // 1. Aplicar Cores e Variáveis
    if (themeData.colors) {
      Object.entries(themeData.colors).forEach(([key, value]) => {
        this.root.style.setProperty(key, value);
      });
    }

    // 2. Aplicar Fontes
    if (themeData.fonts) {
      Object.entries(themeData.fonts).forEach(([key, value]) => {
        this.root.style.setProperty(key, value);
      });
    }
  }
}
