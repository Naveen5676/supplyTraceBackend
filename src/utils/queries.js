/** All Cypher is parameterized — never concatenate user input into query strings.
 * Prefer flat row returns (CognoDB-safe); aggregate maps in Node when needed.
 */

export const PING = `
  RETURN 1 AS ok
`;

export const LIST_PRODUCTS = `
  MATCH (p:Product)
  WHERE $search IS NULL OR $search = ''
     OR toLower(p.name) CONTAINS toLower($search)
     OR toLower(p.category) CONTAINS toLower($search)
  RETURN p.id AS id, p.name AS name, p.category AS category
  ORDER BY p.name
`;

export const LIST_SUPPLIERS = `
  MATCH (s:Supplier)
  WHERE $search IS NULL OR $search = ''
     OR toLower(s.name) CONTAINS toLower($search)
     OR toLower(s.country) CONTAINS toLower($search)
  RETURN s.id AS id, s.name AS name, s.country AS country, s.riskScore AS riskScore
  ORDER BY s.riskScore DESC, s.name
`;

/** Flat product BOM rows — one row per part/supplier/dep combination */
export const PRODUCT_DETAIL = `
  MATCH (p:Product {id: $productId})
  OPTIONAL MATCH (p)-[:CONTAINS]->(part:Part)
  OPTIONAL MATCH (part)-[:SUPPLIED_BY]->(s:Supplier)
  OPTIONAL MATCH (part)-[:DEPENDS_ON]->(dep:Part)
  RETURN p.id AS id,
         p.name AS name,
         p.category AS category,
         part.id AS partId,
         part.name AS partName,
         part.criticality AS partCriticality,
         s.id AS supplierId,
         s.name AS supplierName,
         s.country AS supplierCountry,
         s.riskScore AS supplierRiskScore,
         dep.id AS depId,
         dep.name AS depName,
         dep.criticality AS depCriticality
`;

export const SUPPLIER_EXISTS = `
  MATCH (s:Supplier {id: $supplierId})
  RETURN s.id AS id, s.name AS name, s.country AS country, s.riskScore AS riskScore
  LIMIT 1
`;

/**
 * Multi-hop supplier failure impact (flat rows).
 * Supplier ← SUPPLIED_BY – Part – DEPENDS_ON*0..3 – Part ← CONTAINS – Product
 */
export const SUPPLIER_IMPACT = `
  MATCH (s:Supplier {id: $supplierId})
  OPTIONAL MATCH (s)<-[:SUPPLIED_BY]-(direct:Part)
  OPTIONAL MATCH path = (direct)-[:DEPENDS_ON*0..3]-(related:Part)
  OPTIONAL MATCH (prod:Product)-[:CONTAINS]->(related)
  RETURN s.id AS supplierId,
         s.name AS supplierName,
         s.country AS country,
         s.riskScore AS riskScore,
         related.id AS partId,
         related.name AS partName,
         related.criticality AS partCriticality,
         CASE WHEN path IS NULL THEN null ELSE length(path) END AS hops,
         prod.id AS productId,
         prod.name AS productName,
         prod.category AS productCategory
`;

/**
 * Awkward for relational SQL: variable-length dependency path between two parts.
 * Flat node ids along the path (aggregated in Node).
 */
export const PART_DEPENDENCY_PATHS = `
  MATCH (a:Part {id: $fromPartId}), (b:Part {id: $toPartId})
  MATCH path = shortestPath((a)-[:DEPENDS_ON*1..6]-(b))
  UNWIND nodes(path) AS n
  RETURN n.id AS id, n.name AS name, n.criticality AS criticality, length(path) AS hops
  ORDER BY id
`;

export const CREATE_SUPPLIER = `
  CREATE (s:Supplier {
    id: $id,
    name: $name,
    country: $country,
    riskScore: $riskScore
  })
  RETURN s.id AS id, s.name AS name, s.country AS country, s.riskScore AS riskScore
`;

export const CREATE_PRODUCT = `
  CREATE (p:Product {
    id: $id,
    name: $name,
    category: $category
  })
  RETURN p.id AS id, p.name AS name, p.category AS category
`;

export const CREATE_PART = `
  MATCH (s:Supplier {id: $supplierId})
  CREATE (part:Part {
    id: $id,
    name: $name,
    criticality: $criticality
  })-[:SUPPLIED_BY]->(s)
  RETURN part.id AS id,
         part.name AS name,
         part.criticality AS criticality,
         s.id AS supplierId,
         s.name AS supplierName
`;

export const LINK_PART_TO_PRODUCT = `
  MATCH (prod:Product {id: $productId})
  MATCH (part:Part {id: $partId})
  CREATE (prod)-[:CONTAINS]->(part)
  RETURN prod.id AS productId, prod.name AS productName, part.id AS partId
`;
