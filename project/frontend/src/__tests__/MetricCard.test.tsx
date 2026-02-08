import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricCard } from "../components/MetricCard";
import { DollarSign } from "lucide-react";

describe("MetricCard", () => {
  it("should render title and value", () => {
    render(
      <MetricCard title="Total Revenue" value={15000} icon={<DollarSign />} />
    );

    // TÃ­tulo
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();

    // Valor em PT-BR: 15.000 (ou 15,000 dependendo do locale do ambiente)
    const formatted = new Intl.NumberFormat("pt-BR").format(15000);
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  it("should format value as currency", () => {
    render(
      <MetricCard
        title="Total Revenue"
        value={15000.5}
        format="currency"
        icon={<DollarSign />}
      />
    );

    // Moeda em PT-BR: R$ 15.000,50
    const currency = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(15000.5);
    // Normaliza NBSP e espaÃ§os
    const wanted = currency.replace(/\u00A0/g, " ");
    expect(
      screen.getByText((t) => t.replace(/\u00A0/g, " ") === wanted)
    ).toBeInTheDocument();
  });

  it("should display positive trend", () => {
    render(
      <MetricCard
        title="Total Orders"
        value={150}
        trend={15.5}
        icon={<DollarSign />}
      />
    );

    // Aceita 15.5% ou 15,5% dependendo do ambiente
    const percentMatcher = /15[\.,]5/;
    expect(screen.getByText((t) => percentMatcher.test(t))).toBeInTheDocument();
    // Texto do componente estÃ¡ em PT-BR
    expect(screen.getByText(/vs per/i)).toBeInTheDocument();
  });

  it("should display negative trend", () => {
    render(
      <MetricCard
        title="Total Orders"
        value={150}
        trend={-8.2}
        icon={<DollarSign />}
      />
    );

    expect(screen.getByText(/-8\.2%/)).toBeInTheDocument();
  });

  it("should render custom icon", () => {
    const { container } = render(
      <MetricCard
        title="Test Metric"
        value={100}
        icon={<DollarSign className="test-icon" />}
      />
    );

    expect(container.querySelector(".test-icon")).toBeInTheDocument();
  });

  it("should display subtitle if provided", () => {
    render(
      <MetricCard
        title="Total Revenue"
        value={15000}
        subtitle="Last 30 days"
        icon={<DollarSign />}
      />
    );

    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
  });
});

