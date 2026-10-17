#!/usr/bin/env python3
"""
update_tool_seo.py
Rewrites <title> and <meta name="description"> on all WinWithFred tool pages
to target "free [tool] online" search queries.
Run from the repo root on GitHub Actions.
"""

import re
import os

# Map: filename → (new_title, new_description)
TOOL_PAGES = {
    "wheel-of-life.html": (
        "Free Wheel of Life Assessment Online | WinWithFred",
        "Take the free Wheel of Life assessment online. Rate 8 key life areas and instantly see where you're thriving and where you need focus. No sign-up required."
    ),
    "values-quiz.html": (
        "Free Core Values Quiz Online — Find Your Top Values | WinWithFred",
        "Find your core values with this free quiz online. Discover your top 5 personal values in under 3 minutes. No sign-up needed. Instant results."
    ),
    "burnout-detector.html": (
        "Free Burnout Test Online — Are You Burned Out? | WinWithFred",
        "Take the free burnout test online. 12 questions reveal exactly where you stand across 4 key burnout dimensions. No sign-up. Instant results."
    ),
    "habit-scorecard.html": (
        "Free Habit Scorecard Assessment Online | Rate Your Habits | WinWithFred",
        "Score your current habits with this free habit assessment online. See which habits are serving you and which ones are holding you back. No sign-up required."
    ),
    "eisenhower-matrix.html": (
        "Free Eisenhower Matrix Tool Online | Prioritize Tasks | WinWithFred",
        "Use the free Eisenhower Matrix tool online to prioritize your tasks instantly. Sort by urgent vs. important and focus on what actually matters. No sign-up."
    ),
    "morning-routine.html": (
        "Free Morning Routine Builder Online | Create Your Routine | WinWithFred",
        "Build your perfect morning routine with this free tool. Design a routine that fits your life, not someone else's. No sign-up required. Start in 2 minutes."
    ),
    "reframe-thought.html": (
        "Free Cognitive Reframing Tool Online | Rewire Negative Thoughts | WinWithFred",
        "Use this free cognitive reframing tool online to challenge negative thoughts in 5 simple steps. Based on CBT techniques. No sign-up. Instant results."
    ),
    "whats-holding-you-back.html": (
        "Free Quiz: What's Holding You Back in Life? | WinWithFred",
        "Take this free quiz to discover what's holding you back in life. Identify your #1 hidden blocker — fear, self-sabotage, or something else. No sign-up."
    ),
    "instant-calm.html": (
        "Free Anxiety Relief Tool Online | Instant Calm | WinWithFred",
        "Use this free anxiety relief tool for instant calm. Science-backed breathing and grounding techniques to stop anxiety in its tracks. No sign-up needed."
    ),
    "life-balance.html": (
        "Free Life Balance Assessment Online | WinWithFred",
        "Take this free life balance assessment online. See exactly how balanced your life is right now across all key areas. No sign-up. Instant results."
    ),
    "life-trajectory.html": (
        "Free Life Trajectory Assessment | Where Are You Headed? | WinWithFred",
        "Discover where your current path is taking you with this free life trajectory assessment. See your likely 5-year outcome — and how to change it. No sign-up."
    ),
    "mental-health-check.html": (
        "Free Mental Health Check Online | Self-Assessment | WinWithFred",
        "Take this free mental health check online. A quick self-assessment to see how you're really doing. No sign-up. Results in under 3 minutes."
    ),
    "future-self.html": (
        "Free Future Self Visualization Tool Online | WinWithFred",
        "Visualize your future self with this free tool. A powerful exercise to connect with who you want to become. No sign-up required. Start in 2 minutes."
    ),
    "time-wasted.html": (
        "Free Time Audit Tool Online | How Much Time Are You Wasting? | WinWithFred",
        "Find out how much time you're really wasting each day with this free time audit tool. Instant wake-up call. No sign-up required."
    ),
    "fix-my-life.html": (
        "Free 'Fix My Life' Quiz Online | Get Your Action Plan | WinWithFred",
        "Take the free 'Fix My Life' quiz online. Get a personalized action plan based on what's actually going wrong in your life. No sign-up."
    ),
    "vision-board.html": (
        "Free Digital Vision Board Creator Online | WinWithFred",
        "Create a free digital vision board online. Design your ideal future in minutes. No download, no sign-up required. Start creating now."
    ),
    "weekly-reset.html": (
        "Free Weekly Review Template Online | Reset & Plan Your Week | WinWithFred",
        "Use this free weekly review template online to reset and plan your week. Reflect, refocus, and set your top priorities. No sign-up needed."
    ),
    "habit-builder.html": (
        "Free Habit Tracker Online — No Sign-Up Required | WinWithFred",
        "Track your habits free online — no sign-up required. Build streaks, stay accountable, and finally make your habits stick. Start today."
    ),
    "challenge-90.html": (
        "Free 90-Day Challenge Tracker Online | Transform Your Life | WinWithFred",
        "Start a free 90-day challenge online. Track your daily progress, build momentum, and transform your life in 90 days. No sign-up required."
    ),
    "challenge-30.html": (
        "Free 30-Day Challenge Tracker Online | Build New Habits | WinWithFred",
        "Start a free 30-day challenge online. Build new habits and track your progress daily. No sign-up required. Start in seconds."
    ),
    "goal-tracker.html": (
        "Free Goal Tracker Online — No Sign-Up Needed | WinWithFred",
        "Track your goals free online — no sign-up needed. Set goals, track milestones, and stay accountable all in one place. Start today."
    ),
    "mood-tracker.html": (
        "Free Mood Tracker Online | Track Your Daily Mood | WinWithFred",
        "Track your mood free online every day. Spot emotional patterns, understand your mental health, and feel better. No sign-up required."
    ),
    "journal.html": (
        "Free Online Journal Tool | Daily Journaling | WinWithFred",
        "Start journaling free online today. Guided prompts, daily check-ins, and reflection tools. No sign-up. Private and ad-free."
    ),
    "personality-quiz.html": (
        "Free Personality Quiz Online | Discover Your Type | WinWithFred",
        "Take this free personality quiz online to discover what drives you. Instant results. No sign-up required."
    ),
    "alcohol-assessment.html": (
        "Free Alcohol Use Assessment Online | Check Your Drinking | WinWithFred",
        "Take this free alcohol use assessment online. An honest, non-judgmental check of your drinking habits. No sign-up. Instant results."
    ),
    "meal-plan-quiz.html": (
        "Free Meal Plan Quiz Online | Find Your Perfect Diet | WinWithFred",
        "Take the free meal plan quiz online to find your perfect diet. Get a personalized meal plan in minutes. No sign-up required."
    ),
    "quiz.html": (
        "Free Life Assessment Quiz | Find Out Where You Stand | WinWithFred",
        "Take this free life assessment quiz to see where you really stand. Instant personal development insights. No sign-up needed."
    ),
}


def update_page(filepath, new_title, new_desc):
    if not os.path.exists(filepath):
        print(f"SKIP (not found): {filepath}")
        return False

    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    original = html

    # Replace <title>...</title>
    html = re.sub(
        r"<title>[^<]*</title>",
        f"<title>{new_title}</title>",
        html,
        count=1,
    )

    # Replace <meta name="description" content="...">
    # Handles both single and double quotes, and self-closing variations
    html = re.sub(
        r'<meta\s+name=["\']description["\']\s+content=["\'][^"\']*["\'][^>]*/?>',
        f'<meta name="description" content="{new_desc}" />',
        html,
        count=1,
    )
    # Also try the other attribute order
    if 'meta name="description"' not in html and "meta name='description'" not in html:
        html = re.sub(
            r'<meta\s+content=["\'][^"\']*["\']\s+name=["\']description["\'][^>]*/?>',
            f'<meta name="description" content="{new_desc}" />',
            html,
            count=1,
        )

    # Replace og:title
    html = re.sub(
        r'<meta\s+property=["\']og:title["\']\s+content=["\'][^"\']*["\'][^>]*/?>',
        f'<meta property="og:title" content="{new_title}" />',
        html,
        count=1,
    )

    # Replace twitter:title
    html = re.sub(
        r'<meta\s+(?:name|property)=["\']twitter:title["\']\s+content=["\'][^"\']*["\'][^>]*/?>',
        f'<meta name="twitter:title" content="{new_title}" />',
        html,
        count=1,
    )

    # Replace og:description
    html = re.sub(
        r'<meta\s+property=["\']og:description["\']\s+content=["\'][^"\']*["\'][^>]*/?>',
        f'<meta property="og:description" content="{new_desc}" />',
        html,
        count=1,
    )

    # Replace twitter:description
    html = re.sub(
        r'<meta\s+(?:name|property)=["\']twitter:description["\']\s+content=["\'][^"\']*["\'][^>]*/?>',
        f'<meta name="twitter:description" content="{new_desc}" />',
        html,
        count=1,
    )

    if html == original:
        print(f"no change: {filepath}")
        return False

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"UPDATED: {filepath}")
    return True


def main():
    changed = 0
    for filename, (title, desc) in TOOL_PAGES.items():
        if update_page(filename, title, desc):
            changed += 1
    print(f"\nDone. Updated {changed}/{len(TOOL_PAGES)} pages.")


if __name__ == "__main__":
    main()
