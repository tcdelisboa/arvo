import type { AssetType } from "./types";

/**
 * The browse list: widely held shares and funds, grouped so a beginner can
 * find their way. Anything else on Yahoo Finance is reachable through search.
 *
 * `swing` is a 1-5 judgement of how much the price typically moves
 * (1 = cash-like, 3 = a broad stock fund, 5 = very volatile). It is only used
 * when live price history is unavailable.
 */

export type UniverseEntry = {
  symbol: string;
  name: string;
  type: AssetType;
  group: string;
  sector: string;
  region: string;
  swing: 1 | 2 | 3 | 4 | 5;
  blurb: string;
  /** Broad, diversified fund (as opposed to a single company or a narrow theme). */
  broad?: boolean;
  assetClass?: "stocks" | "bonds" | "cash" | "gold";
};

const etf = (
  symbol: string, name: string, sector: string, region: string, swing: UniverseEntry["swing"], blurb: string,
  extra: Partial<UniverseEntry> = {},
): UniverseEntry => ({ symbol, name, type: "etf", group: "Funds (ETFs)", sector, region, swing, blurb, broad: true, assetClass: "stocks", ...extra });

const stock = (
  symbol: string, name: string, group: string, sector: string, region: string, swing: UniverseEntry["swing"], blurb: string,
): UniverseEntry => ({ symbol, name, type: "stock", group, sector, region, swing, blurb });

export const UNIVERSE: UniverseEntry[] = [
  // Funds
  etf("VWCE.DE", "Vanguard FTSE All-World UCITS ETF", "Global stocks", "World", 3, "About 3,700 companies across developed and emerging markets in one fund."),
  etf("EUNL.DE", "iShares Core MSCI World UCITS ETF", "Global stocks", "Developed markets", 3, "Around 1,400 large and mid-sized companies from 23 developed countries."),
  etf("SXR8.DE", "iShares Core S&P 500 UCITS ETF", "US stocks", "United States", 3, "The 500 largest listed companies in the United States."),
  etf("EXSA.DE", "iShares STOXX Europe 600 UCITS ETF", "European stocks", "Europe", 3, "600 companies from 17 European countries."),
  etf("IS3N.DE", "iShares Core MSCI EM IMI UCITS ETF", "Emerging markets", "Emerging markets", 4, "Around 3,000 companies from emerging economies such as China, India, Taiwan and Brazil."),
  etf("IUSN.DE", "iShares MSCI World Small Cap UCITS ETF", "Smaller companies", "Developed markets", 4, "About 3,500 smaller companies that the big index funds leave out."),
  etf("SXRV.DE", "iShares Nasdaq 100 UCITS ETF", "US technology", "United States", 4, "The 100 largest non-financial companies on the Nasdaq exchange, heavily tilted to technology.", { broad: false }),
  etf("IQQH.DE", "iShares Global Clean Energy UCITS ETF", "Clean energy theme", "World", 5, "A narrow theme fund of about 100 clean energy companies.", { broad: false }),
  etf("EUNA.DE", "iShares Core Global Aggregate Bond UCITS ETF (EUR Hedged)", "Global bonds", "World", 2, "Thousands of high-quality government and company bonds, hedged to the euro.", { assetClass: "bonds" }),
  etf("XEON.DE", "Xtrackers II EUR Overnight Rate Swap UCITS ETF", "Cash-like", "Eurozone", 1, "Pays roughly the euro overnight interest rate. Behaves like a savings account.", { assetClass: "cash" }),
  etf("4GLD.DE", "Xetra-Gold", "Gold", "World", 3, "A security backed by physical gold stored in Frankfurt.", { assetClass: "gold", broad: false }),

  // United States
  stock("AAPL", "Apple", "United States", "Technology", "United States", 3, "iPhone, Mac and a growing services business."),
  stock("MSFT", "Microsoft", "United States", "Technology", "United States", 3, "Windows, Office and the Azure cloud platform."),
  stock("GOOGL", "Alphabet", "United States", "Technology", "United States", 4, "Google Search, YouTube, Android and Google Cloud."),
  stock("AMZN", "Amazon", "United States", "Consumer", "United States", 4, "Online retail and the AWS cloud business."),
  stock("NVDA", "Nvidia", "United States", "Semiconductors", "United States", 5, "Designs the chips that power most AI computing."),
  stock("META", "Meta Platforms", "United States", "Technology", "United States", 4, "Facebook, Instagram and WhatsApp, funded by advertising."),
  stock("TSLA", "Tesla", "United States", "Automotive", "United States", 5, "Electric vehicles, batteries and energy storage."),
  stock("BRK-B", "Berkshire Hathaway", "United States", "Financials", "United States", 2, "Warren Buffett's holding company: insurance, railways, energy and a large share portfolio."),
  stock("JPM", "JPMorgan Chase", "United States", "Financials", "United States", 3, "The largest bank in the United States."),
  stock("V", "Visa", "United States", "Payments", "United States", 3, "One of the two largest card payment networks."),
  stock("MA", "Mastercard", "United States", "Payments", "United States", 3, "Global card payment network."),
  stock("JNJ", "Johnson & Johnson", "United States", "Healthcare", "United States", 2, "Pharmaceuticals and medical devices."),
  stock("LLY", "Eli Lilly", "United States", "Healthcare", "United States", 4, "Pharmaceuticals, known for diabetes and weight-loss medicines."),
  stock("UNH", "UnitedHealth Group", "United States", "Healthcare", "United States", 3, "The largest health insurer in the United States."),
  stock("PG", "Procter & Gamble", "United States", "Consumer staples", "United States", 2, "Household brands such as Pampers, Gillette and Ariel."),
  stock("KO", "Coca-Cola", "United States", "Consumer staples", "United States", 2, "Soft drinks sold in nearly every country."),
  stock("PEP", "PepsiCo", "United States", "Consumer staples", "United States", 2, "Drinks and snacks, including Lay's and Doritos."),
  stock("MCD", "McDonald's", "United States", "Consumer", "United States", 2, "Fast food chain run mostly through franchises."),
  stock("COST", "Costco", "United States", "Retail", "United States", 3, "Membership warehouse retailer."),
  stock("WMT", "Walmart", "United States", "Retail", "United States", 2, "The world's largest retailer by sales."),
  stock("DIS", "Walt Disney", "United States", "Media", "United States", 3, "Films, theme parks and streaming."),
  stock("NFLX", "Netflix", "United States", "Media", "United States", 4, "Subscription video streaming."),
  stock("XOM", "ExxonMobil", "United States", "Energy", "United States", 3, "Oil and gas producer."),
  stock("AVGO", "Broadcom", "United States", "Semiconductors", "United States", 4, "Chips for networking and data centres, plus infrastructure software."),
  stock("AMD", "Advanced Micro Devices", "United States", "Semiconductors", "United States", 5, "Processors and graphics chips for PCs and data centres."),
  stock("SPOT", "Spotify", "United States", "Media", "Sweden", 4, "Music and podcast streaming, listed in New York."),

  // Europe
  stock("ASML.AS", "ASML Holding", "Europe", "Semiconductors", "Netherlands", 4, "Makes the lithography machines used to manufacture advanced chips."),
  stock("SAP.DE", "SAP", "Europe", "Technology", "Germany", 3, "Business software used by most large companies."),
  stock("SIE.DE", "Siemens", "Europe", "Industrials", "Germany", 3, "Industrial automation, rail and building technology."),
  stock("ALV.DE", "Allianz", "Europe", "Financials", "Germany", 2, "One of the world's largest insurers and asset managers."),
  stock("MC.PA", "LVMH", "Europe", "Luxury", "France", 3, "Louis Vuitton, Dior, Tiffany and dozens of other luxury brands."),
  stock("OR.PA", "L'Oréal", "Europe", "Consumer staples", "France", 3, "The world's largest cosmetics company."),
  stock("AIR.PA", "Airbus", "Europe", "Aerospace", "France", 3, "Commercial aircraft, helicopters and defence."),
  stock("SAN.PA", "Sanofi", "Europe", "Healthcare", "France", 2, "Pharmaceuticals and vaccines."),
  stock("TTE.PA", "TotalEnergies", "Europe", "Energy", "France", 3, "Oil, gas and a growing electricity business."),
  stock("NESN.SW", "Nestlé", "Europe", "Consumer staples", "Switzerland", 2, "The world's largest food and drink company."),
  stock("NOVN.SW", "Novartis", "Europe", "Healthcare", "Switzerland", 2, "Swiss pharmaceutical company."),
  stock("NOVO-B.CO", "Novo Nordisk", "Europe", "Healthcare", "Denmark", 4, "Diabetes and weight-loss medicines."),
  stock("ITX.MC", "Inditex", "Europe", "Retail", "Spain", 3, "Owner of Zara and other fashion chains."),
  stock("IBE.MC", "Iberdrola", "Europe", "Utilities", "Spain", 2, "Electricity networks and renewable power."),
  stock("ENEL.MI", "Enel", "Europe", "Utilities", "Italy", 2, "Italy's largest power company."),
  stock("RACE.MI", "Ferrari", "Europe", "Luxury", "Italy", 3, "Sports cars sold in deliberately limited numbers."),
  stock("EDP.LS", "EDP", "Europe", "Utilities", "Portugal", 2, "Portuguese electricity company with a large renewables arm."),
  stock("GALP.LS", "Galp Energia", "Europe", "Energy", "Portugal", 3, "Portuguese oil, gas and fuel retailer."),
  stock("ADYEN.AS", "Adyen", "Europe", "Payments", "Netherlands", 5, "Payment processing for large online and in-store merchants."),
  stock("INGA.AS", "ING Group", "Europe", "Financials", "Netherlands", 3, "Dutch retail and commercial bank."),
];

export const UNIVERSE_BY_SYMBOL = new Map(UNIVERSE.map((entry) => [entry.symbol, entry]));

export const GROUPS = ["Funds (ETFs)", "United States", "Europe"] as const;
