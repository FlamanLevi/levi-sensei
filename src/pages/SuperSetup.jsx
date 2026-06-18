import { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { ref, set } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function SuperSetup({ t }) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  const handleAuth = (e) => {
    e.preventDefault();
    if (password === 'levi123') { // Hardcoded super admin password just for setup
      setIsAuthenticated(true);
    } else {
      alert('Wrong password');
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm('This will create dummy schools and register hidden Firebase Auth accounts for the teachers. Proceed?')) return;
    
    setIsLoading(true);
    setLogs([]);

    const dummySchools = {
      "4545": {
        id: "futako",
        name_en: "Futakotamagawa ES",
        name_ja: "二子玉川小学校",
        teachers: {
          "teacher1": { name_en: "Mrs. Kojima", name_ja: "Kojima先生", avatar: "👩‍🏫", pin: "3333" },
          "teacher2": { name_en: "Mr. Yoshimura", name_ja: "吉村先生", avatar: "🏉", pin: "5555" },
          "teacher3": { name_en: "Mr. Sakai", name_ja: "酒井先生", avatar: "👨‍🏫", pin: "6666" }
        }
      },
      "8989": {
        id: "toyogaoka",
        name_en: "Toyogaoka ES",
        name_ja: "豊ヶ丘小学校",
        teachers: {
          "teacher1": { name_en: "Mrs. Muraishi", name_ja: "Muraishi先生", avatar: "👩‍🏫", pin: "1111" }
        }
      },
      "1234": {
        id: "test",
        name_en: "Test / Home",
        name_ja: "テスト・ホーム",
        teachers: {
          "teacher1": { name_en: "Levi Sandbox", name_ja: "リヴァイ先生 (テスト)", avatar: "🛠️", pin: "1111" }
        }
      }
    };

    try {
      // 1. Write the schools to the database
      addLog("Attempting to write schools to database...");
      try {
        await set(ref(db, 'schools'), dummySchools);
        addLog("✅ Schools database updated directly via client.");
      } catch (dbErr) {
        addLog(`⚠️ Could not write to DB directly (Permission Denied). This is normal if your rules are secure!`);
        addLog(`👉 Please import the downloaded 'schools.json' file manually into your Firebase RTDB Console at the root level.`);
        
        // Generate a downloadable JSON blob for them to import
        const jsonString = JSON.stringify({ schools: dummySchools }, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        // Trigger auto-download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schools.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      // 2. Create the hidden Auth accounts
      for (const [passcode, school] of Object.entries(dummySchools)) {
        for (const [teacherId, teacher] of Object.entries(school.teachers)) {
          const email = `${school.id}_${teacherId}@levisensei.local`;
          const pw = `${passcode}${teacher.pin}`;
          
          addLog(`Creating auth account: ${email}`);
          try {
            await createUserWithEmailAndPassword(auth, email, pw);
            addLog(`✅ Successfully created: ${email}`);
          } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
              addLog(`⚠️ Account already exists: ${email}. Skipping...`);
            } else {
              addLog(`❌ Failed to create ${email}: ${err.message}`);
            }
          }
        }
      }

      // 3. Create the Master Admin Account
      const adminEmail = `admin@levisensei.local`;
      const adminPw = `051683`;
      addLog(`Creating MASTER ADMIN account: ${adminEmail}`);
      try {
        await createUserWithEmailAndPassword(auth, adminEmail, adminPw);
        addLog(`✅ Successfully created MASTER ADMIN: ${adminEmail}`);
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          addLog(`⚠️ Account already exists: ${adminEmail}. Skipping...`);
        } else {
          addLog(`❌ Failed to create ${adminEmail}: ${err.message}`);
        }
      }

      addLog("🎉 Setup Script Complete!");

    } catch (err) {
      console.error(err);
      addLog(`❌ Fatal Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <h2 className="text-2xl font-bold mb-4 text-red-500">SUPER ADMIN SETUP</h2>
        <form onSubmit={handleAuth} className="flex gap-2">
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-2 p-2 rounded"
            placeholder="Super Admin Password"
          />
          <button className="bg-red-500 text-white px-4 py-2 rounded font-bold">Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-[var(--surface-color)] rounded-xl mt-8 shadow-xl border-4 border-red-500 animate-in fade-in">
      <h2 className="text-3xl font-black text-red-500 mb-2">Super Admin Setup</h2>
      <p className="text-[var(--text-muted)] font-bold mb-8">
        Use this tool to automatically configure the dummy schools and register the hidden Firebase Auth accounts for testing.
      </p>

      <button
        onClick={handleSeedData}
        disabled={isLoading}
        className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
      >
        {isLoading ? "Running..." : "SEED DATABASE & ACCOUNTS"}
      </button>

      {logs.length > 0 && (
        <div className="mt-8 bg-black text-green-400 p-4 rounded-xl font-mono text-sm h-64 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
