# GMMA

GMMA is a modular music & video server with a complete and beautiful frontend. Host your own server, we'll handle the UI.

<img width="3840" height="1987" alt="image" src="https://github.com/user-attachments/assets/d885e884-df06-4b8f-a9a4-c23572004952" />

<img width="2277" height="1226" alt="image" src="https://github.com/user-attachments/assets/374c5a52-5413-4392-84da-cc2b9a251403" />

<img width="1920" height="1137" alt="image" src="https://github.com/user-attachments/assets/45271bc6-1f94-4e8e-9074-0f34dc99fe56" />

### Setup - backend

Clone the repo, and head into the gmma-backend folder. You'll want to host this one.

***IMPORTANT:*** Install FFMPEG on your machine before hosting! This is required for videos, youtube downloading, and other crucial features.

Start by editing the config.json.example (renaming it to config.json first). Add your Genius api stuff from [here](https://genius.com/api-clients) if you want external search (Search for pre-made songs instead of uploading your own).

### Setup - frontend

Visit our frontend and enter your server URL, or host your own via `npm start` in the `gmma` folder.
