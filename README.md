# Personal Gym Workout Tracker

A self-hosted, single user web app for tracking workouts. 

I wrote it to fill a need I have – 
1. I don't want to pay for a workout tracking app, something which I could write and host myself. I also want to customise it to how I train, including experimenting with different weight training, swimming and running programs.
2. I wanted to test the state of AI generated coding. This app is almost entirely generated using gemini 2.5 flash and chatgpt. About all I did was design the data model in SQLite. The rest is prompting, reviewing the code and focusing on shipping a project over a long weekend.

## Features

* **Workout Sessions:** Create new workout sessions based on predefined programs and days.
* **Exercise Tracking:** Log weight, reps, and mark sets as completed for each exercise within a session.
* **Session History:** View a list of recent workout sessions.
* **Session Review:** Click on a recent workout to navigate back through the exercises performed in that session.
* **Simple Navigation:** Move between exercises within an active or reviewed session.

## Technologies Used

* **Backend:** Python Flask
* **Database:** SQLite
* **Frontend:** HTML, CSS, and JavaScript

## Running

NOTE: No attempt has been made to secure this app. Do not expose it directly to the internet. I run this app on my server at home, and connect to it using my VPN.

To run the app using [Docker Compose](docker-compose.yaml)

```bash
docker compose up -d
```

If you make any changes and want to rebuild the app

```bash
docker compose up --build
```
