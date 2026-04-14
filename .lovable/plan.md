# 🧠 1. SYSTEM OVERVIEW

## 🎯 Goal

A web app where:

- **Faculty logs student activities**
- **Students view their records + total points**

---

## 👥 Users

- **Faculty (Admin)** → insert + view all
- **Student** → view only their own data

---

## 🏗️ Architecture

```
Next.js (Frontend + API)
        ↓
Supabase (PostgreSQL + Auth + Storage)
        ↓
Vercel Deployment
```

---

# 🧱 2. DATABASE SETUP (Supabase)

## ✅ Step 1: Create Tables

### `profiles`

```
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  register_number text UNIQUE NOT NULL,
  name text NOT NULL
);
```

---

### `user_roles`

```
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  role text CHECK (role IN ('faculty','student')) NOT NULL,
  UNIQUE (user_id, role)
);
```

---

### `activity_logs`

```
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) NOT NULL,
  faculty_id uuid REFERENCES profiles(id) NOT NULL,
  activity_name text NOT NULL,
  date date NOT NULL,
  points integer CHECK (points >= 0) NOT NULL,
  proof_url text,
  created_at timestamptz DEFAULT now()
);
```

---

## ⚡ Indexes

```
CREATE INDEX idx_logs_student_id ON activity_logs(student_id);
CREATE INDEX idx_logs_faculty_id ON activity_logs(faculty_id);
```

---

# 🔐 3. SECURITY (RLS)

## Enable RLS

```
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

---

## Function

```
CREATE OR REPLACE FUNCTION has_role(uid uuid, role_name text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid AND role = role_name
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Policies

### activity_logs

#### Faculty insert

```
CREATE POLICY "faculty_insert"
ON activity_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'faculty'));
```

---

#### Faculty select all

```
CREATE POLICY "faculty_select_all"
ON activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'faculty'));
```

---

#### Student select own

```
CREATE POLICY "student_select_own"
ON activity_logs
FOR SELECT
USING (student_id = auth.uid());
```

---

### profiles

#### Own profile

```
CREATE POLICY "user_profile"
ON profiles
FOR SELECT
USING (id = auth.uid());
```

---

#### Faculty access all

```
CREATE POLICY "faculty_profile"
ON profiles
FOR SELECT
USING (has_role(auth.uid(), 'faculty'));
```

---

# 📦 4. STORAGE SETUP

## Bucket: `proofs`

### Rules:

-   
Faculty → upload  

-   
Students → read only  


---

## File path structure:

```
proofs/{student_id}/{filename}.pdf
```

---

# 🔑 5. AUTH SETUP

## Create users manually (Supabase dashboard)

### Example:


| Role    | Register No | Email                |
| ------- | ----------- | -------------------- |
| Faculty | FAC001      | FAC001@student.local |
| Student | STU001      | STU001@student.local |
| Student | STU002      | STU002@student.local |


---

## Insert profiles

```
INSERT INTO profiles (id, register_number, name)
VALUES ('<auth_uid>', 'STU001', 'Student One');
```

---

## Insert roles

```
INSERT INTO user_roles (user_id, role)
VALUES ('<auth_uid>', 'student');
```

---

# ⚙️ 6. BACKEND LOGIC (Next.js API)

---

## 🔹 createLog

### Flow:

1.   
Get register_number  

2.   
Fetch student_id  

3.   
Upload PDF  

4.   
Insert into DB  


```
const { data: student } = await supabase
  .from('profiles')
  .select('id')
  .eq('register_number', regNo)
  .single();

if (!student) throw new Error("Invalid register number");

await supabase.from('activity_logs').insert({
  student_id: student.id,
  faculty_id: user.id,
  activity_name,
  date,
  points,
  proof_url
});
```

---

## 🔹 getStudentLogs

```
supabase
  .from('activity_logs')
  .select('*')
  .eq('student_id', user.id);
```

---

## 🔹 getAllLogs (faculty)

```
supabase
  .from('activity_logs')
  .select(`
    *,
    student:profiles!activity_logs_student_id_fkey(name, register_number),
    faculty:profiles!activity_logs_faculty_id_fkey(name)
  `);
```

---

## 🔹 total points

```
SELECT SUM(points)
FROM activity_logs
WHERE student_id = auth.uid();
```

---

# 🖥️ 7. FRONTEND STRUCTURE

```
/app
  /login
  /faculty
  /student
  /api
/lib
  supabaseClient.ts
```

---

## Pages

### `/`

-   
Landing page  


---

### `/login`

-   
Input: register number + password  

-   
Convert → email  


---

### `/faculty`

-   
Form:  

  -   
  register number  

  -   
  activity name  

  -   
  date  

  -   
  points  

  -   
  PDF upload  

-   
Table: all logs  


---

### `/student`

-   
Table: own logs  

-   
Total points card  


---

# 🎨 8. UI

-   
Tailwind CSS  

-   
shadcn components  

-   
Keep it:  

  -   
  Clean  

  -   
  Functional  

  -   
  No overdesign  


---

# 🚀 9. DEPLOYMENT

## Steps:

1.   
Push code to GitHub  

2.   
Deploy on Vercel  

3.   
Add env variables:  


```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

4.   
Done  


---

# 🧪 10. TESTING (DON’T SKIP)

### Test cases:

-   
Faculty login → create log  

-   
Invalid register number → error  

-   
Student login → only own data  

-   
File upload works  

-   
Total points correct  


---

# 🧠 11. VIVA DEFENSE POINTS

If they ask:

### ❓ Why UUID?

> For referential integrity and efficient joins.

---

### ❓ Why separate roles?

> Enables scalable role-based access control.

---

### ❓ How security handled?

> Row Level Security with role-based policies.

---

### ❓ DB concepts used?

-   
Normalization  

-   
Foreign keys  

-   
Constraints  

-   
Aggregation  

-   
Indexing  
