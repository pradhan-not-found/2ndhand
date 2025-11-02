# 2ndhand - A Campus E-Commerce Marketplace

**2ndhand** is a full-stack e-commerce platform designed specifically for college students to buy and sell second-hand items. It aims to create a trusted, local marketplace for students, featuring everything from textbooks and electronics to services and homemade goods.

The platform supports both individual item sales and dedicated "Business Listings" for students offering services or goods on a regular basis.

---

## ✨ Features

* **Secure User Authentication:** Full sign-up, login, and logout functionality powered by Supabase Auth.
* **Password Visibility Toggle:** "See password" icon on both login and signup forms for a better user experience.
* **Create & Manage Listings:** Users can easily sell their products, upload multiple images to Supabase Storage, and delete/mark items as sold from their profile.
* **Dual Listing Types:** Supports both standard `Product` sales and premium `Business Listings` for student entrepreneurs.
* **Scalable Browsing (Pagination):** Both the "Browse" and "Business" pages are built with server-side filtering and pagination ("Load More" button). This ensures the site remains fast and stable, even with thousands of listings.
* **Server-Side Filtering:** Users can filter items by **Search Term**, **Category**, and **Price**, with all the work being done on the database, not in the browser.
* **Shopping Cart:** A persistent cart that allows users to add, view, and remove items.
* **Payment Gating:** Business features (like posting) are locked, requiring users to have an `active` business status, simulating a payment system.
* **Featured Listings:** A system for businesses to reserve and purchase featured spots on the homepage.
* **Dark/Light Mode:** A theme toggle that respects the user's system preference and saves their choice in `localStorage`.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (with Dark Mode), JavaScript (ES6+)
* **Backend & Database:** **Supabase**
    * **Supabase Auth:** For managing users, logins, and row-level security.
    * **Supabase Database:** PostgreSQL for all application data (listings, profiles, etc.).
    * **Supabase Storage:** For hosting all user-uploaded images and static site assets.
* **Deployment:** **Vercel**
