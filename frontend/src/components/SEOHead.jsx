import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * SEO component for managing page-specific meta tags including robots directives
 * 
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Page description
 * @param {string} props.robots - Robots directive (defaults to indexable)
 * @param {string} props.canonical - Canonical URL
 * @param {Object} props.openGraph - Open Graph properties
 * @param {Array} props.additionalMeta - Additional meta tags
 */
const SEOHead = ({
  title = "Indians in Ghana - Membership Portal",
  description = "Indians in Ghana - Digital Membership Community",
  robots = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  canonical,
  openGraph = {},
  additionalMeta = []
}) => {
  const fullTitle = title.includes('Indians in Ghana') ? title : `${title} | Indians in Ghana`;
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={openGraph.type || "website"} />
      <meta property="og:site_name" content="Indians in Ghana" />
      {openGraph.url && <meta property="og:url" content={openGraph.url} />}
      {openGraph.image && <meta property="og:image" content={openGraph.image} />}
      
      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {openGraph.image && <meta name="twitter:image" content={openGraph.image} />}
      
      {/* Additional meta tags */}
      {additionalMeta.map((meta, index) => (
        <meta key={index} {...meta} />
      ))}
    </Helmet>
  );
};

// Pre-configured components for common scenarios
export const IndexablePage = (props) => (
  <SEOHead 
    {...props} 
    robots="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" 
  />
);

export const NoIndexPage = (props) => (
  <SEOHead 
    {...props} 
    robots="noindex, follow" 
  />
);

export const PrivatePage = (props) => (
  <SEOHead 
    {...props} 
    robots="noindex, nofollow, noarchive, nosnippet" 
  />
);

export const AdminPage = (props) => (
  <SEOHead 
    {...props} 
    robots="noindex, nofollow, noarchive, nosnippet, noimageindex" 
  />
);

export default SEOHead;
