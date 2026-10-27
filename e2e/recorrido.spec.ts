import { expect, test } from "@playwright/test";

test("recorrido crítico: crear cuenta, pedir y devolver", async ({ page }) => {
  const correo = `e2e.${Date.now()}@biblioteca.local`;
  await page.goto("/");

  await page.locator("#form-registro input[name='nombre']").fill("Recorrido");
  await page.locator("#form-registro input[name='correo']").fill(correo);
  await page.locator("#form-registro input[name='contrasena']").fill("clave123");
  await page.locator("#form-registro button").click();
  await expect(page.locator("#aviso")).toContainText("Cuenta creada.");

  await page.locator("#form-ingreso input[name='correo']").fill(correo);
  await page.locator("#form-ingreso input[name='contrasena']").fill("clave123");
  await page.locator("#form-ingreso button").click();
  await expect(page.getByRole("heading", { name: "El principito" })).toBeVisible();
  await expect(page.locator("#libres")).toHaveText("5");

  await page.getByRole("button", { name: "Pedir" }).click();
  await expect(page.locator("#aviso")).toContainText(/Te llevás la copia número \d/);
  await page.getByRole("button", { name: "Devolver" }).click();
  await expect(page.locator("#aviso")).toContainText(/Devolviste la copia número \d/);
  await expect(page.locator("#libres")).toHaveText("5");
});
