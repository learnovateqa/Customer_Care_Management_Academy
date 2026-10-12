# Customer Care Management · Course website

Elevate with Ms. Maria · Learnovate Qatar

## Folder layout

```
index.html              landing page: choose Level 4 or Level 5
level4/
  index.html            "coming soon" page for now
level5/
  index.html            Level 5 StudySphere (do not edit week by week)
  downloads/
    syllabus.pdf        Level 5 syllabus, exported as PDF
  week01/
    slides.pdf          Session 1 deck, downloaded as PDF
    handout.pdf         Session 1 handout (PDF)
    slides/             slide images for the in-page viewer (01.jpg, 02.jpg ... + count.txt)
    workbook.html       Session 1 e-workbook
    quiz.html           Session 1 practice quiz
    form.txt            one line: the link to the graded Google Form
  week02/ ... week12/   same file names each week
```

Each week's buttons switch on by themselves when its files are in the folder. Use exactly these file names, all lowercase.

## Site link

`https://YOUR-ACCOUNT.github.io/Customer_Care_Management/`

Capital letters in the link matter. Share it through the QR code.

## First upload

1. Unzip this file. Drag everything inside it into the Customer_Care_Management repository and commit.
2. Settings, then Pages: Branch `main`, folder `/ (root)`, Save.

## Every week (Level 5)

Upload the week's zip and slide PDF to the repository, then give the cloud session this instruction (change the week number):

Unzip the uploaded week zip into level5/weekNN/. Move the uploaded slide PDF to level5/weekNN/slides.pdf. Convert slides.pdf into JPG images, one per page, 1600 px wide, named 01.jpg, 02.jpg and so on, in level5/weekNN/slides/, and create level5/weekNN/slides/count.txt containing only the number of pages. Commit to main and push.

## Rules

- The site is public. Never upload exam questions, answer keys, grades or learner names.
- Keep each file under 25 MB.
- Graded exit tickets go in Google Forms, not on this site.

## Installable app

The site is an installable web app (manifest.webmanifest, sw.js, icons/). Learners install it from the "Install the app" page.
If you ever change sw.js, change the CACHE name inside it (for example ccm-app-v2) so phones pick up the new version.
