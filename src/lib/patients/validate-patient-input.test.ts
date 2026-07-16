import { describe, expect, it } from "vitest";
import {
  normalizePhone,
  validatePatientName,
  validatePatientPhone,
  validateReason,
} from "./validate-patient-input";

describe("normalizePhone", () => {
  it("quita espacios, guiones y paréntesis", () => {
    expect(normalizePhone("555-123 4567")).toBe("5551234567");
    expect(normalizePhone("(555) 123-4567")).toBe("5551234567");
  });

  it("deja igual un teléfono ya normalizado", () => {
    expect(normalizePhone("5551234567")).toBe("5551234567");
  });
});

describe("validatePatientName", () => {
  it("acepta un nombre normal", () => {
    expect(validatePatientName("Juan Pérez")).toBeNull();
  });

  it("rechaza nombres de menos de 2 caracteres", () => {
    expect(validatePatientName("A")).not.toBeNull();
  });

  it("rechaza nombres de más de 120 caracteres", () => {
    expect(validatePatientName("a".repeat(121))).not.toBeNull();
  });

  it("rechaza un nombre vacío o solo espacios", () => {
    expect(validatePatientName("   ")).not.toBeNull();
  });
});

describe("validatePatientPhone", () => {
  it("acepta 10 dígitos", () => {
    expect(validatePatientPhone("5551234567")).toBeNull();
  });

  it("acepta hasta 15 dígitos", () => {
    expect(validatePatientPhone("123456789012345")).toBeNull();
  });

  it("rechaza menos de 10 dígitos", () => {
    expect(validatePatientPhone("12345")).not.toBeNull();
  });

  it("rechaza más de 15 dígitos", () => {
    expect(validatePatientPhone("1234567890123456")).not.toBeNull();
  });
});

describe("validateReason", () => {
  it("acepta null (motivo opcional)", () => {
    expect(validateReason(null)).toBeNull();
  });

  it("acepta hasta 500 caracteres", () => {
    expect(validateReason("x".repeat(500))).toBeNull();
  });

  it("rechaza más de 500 caracteres", () => {
    expect(validateReason("x".repeat(501))).not.toBeNull();
  });
});
