import { useLocation, useParams } from "react-router-dom";
import EntityDocs from "./EntityDocs";

const entityKeyFor = (section, mod) =>
  section === "product"
    ? (mod === "ev" ? "product_ev" : mod === "mobile-loan" ? "product_mobile" : "product_education")
    : (mod === "ev" ? "lender_ev"
      : mod === "adikosh" ? "lender_adikosh"
      : mod === "gq-fsf" ? "lender_gq_fsf"
      : mod === "gq-nonfsf" ? "lender_gq_nonfsf"
      : "lender_bl");

export default function ModuleEntityDocs() {
  const { module } = useParams();
  const loc = useLocation();
  const section = loc.pathname.startsWith("/product") ? "product" : "lender";

  const entityKey = entityKeyFor(section, module);

  // Use /login as the default "Back" destination (change to /all if you prefer)
  const config = {
    name: `${section === "product" ? "Product" : "Lender"} • ${module}`,
    apiBase: `/${section}/${module}`,    // e.g. /product/ev
    uiBase: `/${section}/${module}/login`,
    entityKey,                           // used by /docs/:entityKey/:id
    idField: "customer_id",              // all product/lender modules use customer_id
  };

  return <EntityDocs config={config} />;
}
