#!/usr/bin/env python3
"""Update title and meta description for all 27 WinWithFred tool pages.
Target: 'free [tool] online' keyword pattern, titles under 60 chars.
"""
import re, os

SEO = {
    "alcohol-assessment": ("Free Alcohol Assessment Online | WinWithFred", "Take this free alcohol assessment online. An honest, judgment-free check of your drinking habits. No sign-up. Instant results."),
    "burnout-detector": ("Free Burnout Test Online | WinWithFred", "Take the free burnout test online. 12 questions reveal exactly where you stand across 4 key burnout dimensions. No sign-up. Instant results."),
    "eisenhower-matrix": ("Free Eisenhower Matrix Tool Online | WinWithFred", "Use the free Eisenhower Matrix tool online to prioritize your tasks. Sort by urgent vs. important and focus on what actually matters. No sign-up."),
    "fix-my-life": ("Free Fix My Life Quiz Online | WinWithFred", "Take the free Fix My Life quiz online. Answer 10 questions and get a personalized action plan for what to work on first. No sign-up needed."),
    "future-self": ("Free Future Self Visualization Tool Online | WinWithFred", "Visualize your future self with this free tool. A powerful exercise to connect with who you want to become. No sign-up required. Start in 2 minutes."),
    "goal-tracker": ("Free Goal Tracker Online | WinWithFred", "Track your goals free online. Set goals, break them into milestones, and stay accountable every step of the way. No sign-up needed."),
    "habit-builder": ("Free Habit Tracker Online | WinWithFred", "Track your habits free online. Build streaks, stay accountable, and finally make your habits stick. No sign-up required."),
    "habit-scorecard": ("Free Habit Scorecard Online | WinWithFred", "Score your current habits with this free habit scorecard online. See which habits are serving you and which are holding you back. No sign-up required."),
    "instant-calm": ("Free Anxiety Relief Tool Online | WinWithFred", "Use this free anxiety relief tool for instant calm. Science-backed breathing and grounding techniques to stop anxiety in its tracks. No sign-up needed."),
    "journal": ("Free Online Journal Tool | WinWithFred", "Use this free online journal tool to write, reflect, and clear your head. Private, simple, and no sign-up required. Start journaling today."),
    "life-balance": ("Free Life Balance Assessment Online | WinWithFred", "Take this free life balance assessment online. See exactly how balanced your life is right now across all key areas. No sign-up. Instant results."),
    "life-trajectory": ("Free Life Trajectory Assessment | WinWithFred", "Discover where your current path is taking you. This free life trajectory assessment shows your likely 5-year outcome and how to change it. No sign-up."),
    "meal-plan-quiz": ("Free Meal Plan Quiz Online | WinWithFred", "Take the free meal plan quiz online to find your perfect diet. Get a personalized meal plan in minutes. No sign-up required."),
    "mental-health-check": ("Free Mental Health Check Online | WinWithFred", "Take this free mental health check online. A quick self-assessment to see how you're really doing across key areas of your wellbeing. No sign-up."),
    "mood-tracker": ("Free Mood Tracker Online | WinWithFred", "Track your mood free online every day. Spot emotional patterns, understand your mental health, and feel better. No sign-up required."),
    "morning-routine": ("Free Morning Routine Builder Online | WinWithFred", "Build your perfect morning routine with this free tool. Design a routine that actually fits your life and helps you start the day on your terms."),
    "personality-quiz": ("Free Personality Quiz Online | WinWithFred", "Take this free personality quiz online to discover what drives you. Instant results. No sign-up required."),
    "reframe-thought": ("Free Cognitive Reframing Tool Online | WinWithFred", "Use this free cognitive reframing tool online to challenge negative thoughts in 5 simple steps. Based on CBT techniques. No sign-up. Instant results."),
    "time-wasted": ("Free Time Audit Tool Online | WinWithFred", "Find out how much time you waste each week with this free time audit tool online. An instant eye-opener. No sign-up needed."),
    "values-quiz": ("Free Core Values Quiz Online | WinWithFred", "Find your core values with this free quiz online. Discover your top 5 personal values in under 3 minutes. No sign-up needed. Instant results."),
    "vision-board": ("Free Digital Vision Board Creator Online | WinWithFred", "Create a free digital vision board online. Design your ideal future in minutes. No download, no sign-up required. Start creating now."),
    "weekly-reset": ("Free Weekly Review Template Online | WinWithFred", "Use this free weekly review template online to reset and plan your week. Reflect, refocus, and set your top priorities. No sign-up needed."),
    "whats-holding-you-back": ("Free Quiz: What's Holding You Back in Life? | WinWithFred", "Take this free quiz to discover what's holding you back in life. Get clear on your biggest mental block and what to do about it. No sign-up."),
    "wheel-of-life": ("Free Wheel of Life Assessment Online | WinWithFred", "Take the free Wheel of Life assessment online. Rate 8 key life areas and instantly see where you're balanced and where you're falling behind."),
    "challenge-30": ("Free 30-Day Challenge Tracker Online | WinWithFred", "Start a free 30-day challenge online. Build new habits and track your progress daily. No sign-up required. Start in seconds."),
    "challenge-90": ("Free 90-Day Challenge Tracker Online | WinWithFred", "Start a free 90-day challenge online. Track your daily progress, build momentum, and transform your life in 90 days. No sign-up required."),
    "quiz": ("Free Life Assessment Quiz Online | WinWithFred", "Take this free life assessment quiz online to see where you really stand. Instant personal development insights. No sign-up needed."),
}

updated = 0
skipped = 0

for slug, (new_title, new_meta) in SEO.items():
    path = slug + ".html"
    if not os.path.exists(path):
        print("SKIP: " + path)
        skipped += 1
        continue

    with open(path, encoding="utf-8") as f:
        html = f.read()

    # Replace title
    if "<title>" in html and "</title>" in html:
        s = html.index("<title>") + 7
        e = html.index("</title>")
        html_new = html[:s] + new_title + html[e:]
    else:
        html_new = html

    # Replace meta description (double-quote variant)
    html_new = re.sub(
        'name="description" content="[^"]*"',
        'name="description" content="' + new_meta + '"',
        html_new
    )
    # Single-quote variant
    html_new = re.sub(
        "name='description' content='[^']*'",
        'name="description" content="' + new_meta + '"',
        html_new
    )

    if html_new != html:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html_new)
        print("UPDATED " + slug + " -> " + new_title + " (" + str(len(new_title)) + "c)")
        updated += 1
    else:
        print("UNCHANGED " + slug)
        skipped += 1

print("\nDone: " + str(updated) + " updated, " + str(skipped) + " skipped")
