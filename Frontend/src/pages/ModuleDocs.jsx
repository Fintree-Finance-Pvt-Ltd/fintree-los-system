import { useLocation, useParams } from "react-router-dom";
import Docs from "./Docs";

// Map URL module → entity name used by your docs backend
const entityNameFor = (section, mod) =>
  section === "product"
    ? (mod === "ev" ? "product_ev" : mod === "mobile-loan" ? "product_mobile" : "product_education")
    : (mod === "ev" ? "lender_ev" :
       mod === "adikosh" ? "lender_adikosh" :
       mod === "gq-fsf" ? "lender_gq_fsf" :
       mod === "gq-nonfsf" ? "lender_gq_nonfsf" : "lender_bl");

/**
 * Thin wrapper that renders your existing Docs page but tells it which entity + record to load.
 * Docs.jsx should optionally read these props (see patch below).
 */
export default function ModuleDocs() {
  const { module, id } = useParams();
  const loc = useLocation();
  const section = loc.pathname.startsWith("/product") ? "product" : "lender";
  const entity = entityNameFor(section, module);

  return <Docs initialEntity={entity} initialEntityId={id} />;
}
