import { useState } from 'react';
import { companyDomain } from '../constants.js';

export default function CompanyLogo({ name }) {
  const [failed, setFailed] = useState(false);
  const domain = companyDomain(name);

  if (failed || !domain) {
    const initial = name?.trim()?.[0]?.toUpperCase() || '?';
    return <div className="company-logo company-logo--fallback">{initial}</div>;
  }

  return (
    <img
      className="company-logo"
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}
