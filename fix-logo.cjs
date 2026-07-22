const fs = require('fs');

// Layout.tsx
let layout = fs.readFileSync('src/components/Layout.tsx', 'utf8');
if (!layout.includes('const [logoError, setLogoError] = useState(false);')) {
  layout = layout.replace('const { user, logout } = useAuth();', 'const { user, logout } = useAuth();\n  const [logoError, setLogoError] = useState(false);');
  layout = layout.replace(/\{companyInfo\.logoUrl \? \(/g, '{companyInfo.logoUrl && !logoError ? (');
  layout = layout.replace(/<img src=\{companyInfo\.logoUrl\} alt="Logo"/g, '<img src={companyInfo.logoUrl} onError={() => setLogoError(true)} alt="Logo"');
  fs.writeFileSync('src/components/Layout.tsx', layout);
}

// Login.tsx
let login = fs.readFileSync('src/pages/Login.tsx', 'utf8');
if (!login.includes('const [logoError, setLogoError] = useState(false);')) {
  login = login.replace('const [error, setError] = useState<string | null>(null);', 'const [error, setError] = useState<string | null>(null);\n  const [logoError, setLogoError] = useState(false);');
  login = login.replace(/\{companyInfo\.logoUrl \? \(/g, '{companyInfo.logoUrl && !logoError ? (');
  login = login.replace(/<img src=\{companyInfo\.logoUrl\} alt="Logo"/g, '<img src={companyInfo.logoUrl} onError={() => setLogoError(true)} alt="Logo"');
  fs.writeFileSync('src/pages/Login.tsx', login);
}

// AdminDashboard.tsx
let admin = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
if (!admin.includes('const [logoError, setLogoError] = useState(false);')) {
  admin = admin.replace('const [uploadingLogo, setUploadingLogo] = useState(false);', 'const [uploadingLogo, setUploadingLogo] = useState(false);\n  const [logoError, setLogoError] = useState(false);');
  admin = admin.replace(/\{companyInfo\.logoUrl \? \(/g, '{companyInfo.logoUrl && !logoError ? (');
  admin = admin.replace(/<img src=\{companyInfo\.logoUrl\} alt="Logo"/g, '<img src={companyInfo.logoUrl} onError={() => setLogoError(true)} alt="Logo"');
  fs.writeFileSync('src/pages/AdminDashboard.tsx', admin);
}

console.log("Fixed logos");
