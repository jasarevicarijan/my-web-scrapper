import axios, { AxiosError } from "axios";
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import {resolve} from 'path';
import { JSDOM } from 'jsdom';


// Function for fetching website
function fetchPage(url: string): Promise<string | undefined> {
    const HTMLData = axios
      .get(url)
      .then(res => res.data)
      .catch((error: AxiosError) => {
        if(error.config)
            console.error(`There was an error with ${error.config.url}.`);
        console.error(error.toJSON());
      });
  
    return HTMLData;
  }

// Function for caching scraped pages
async function fetchFromWebOrCache(url: string, ignoreCache = false) {
    // If the cache folder doesn't exist, create it
    if (!existsSync(resolve(__dirname, '.cache'))) {
      mkdirSync('.cache');
    }
    console.log(`Getting data for ${url}...`);
    if (
      !ignoreCache &&
      existsSync(
        resolve(__dirname, `.cache/${Buffer.from(url).toString('base64')}.html`),
      )
    ) {
      console.log(`I read ${url} from cache`);
      const HTMLData = await readFile(
        resolve(__dirname, `.cache/${Buffer.from(url).toString('base64')}.html`),
        { encoding: 'utf8' },
      );
      const dom = new JSDOM(HTMLData);
      return dom.window.document;
    } else {
      console.log(`I fetched ${url} fresh`);
      const HTMLData = await fetchPage(url);
      if (!ignoreCache && HTMLData) {
        writeFile(
          resolve(
            __dirname,
            `.cache/${Buffer.from(url).toString('base64')}.html`,
          ),
          HTMLData,
          { encoding: 'utf8' },
        );
      }
      const dom = new JSDOM(HTMLData);
      return dom.window.document;
    }
  }

// Function to extract data with jsdom about front page links
function extractData(document: Document) {
    const titleLinks = document.querySelectorAll('.titleline > a');
  
    return Array.from(titleLinks).map(link => ({
      title: link.textContent,
      url: link.getAttribute('href'),
    }));
  }
  

  // Function to save data
  function saveData(filename: string, data: any) {
    if (!existsSync(resolve(__dirname, 'data'))) {
      mkdirSync('data');
    }
    writeFile(resolve(__dirname, `data/${filename}.json`), JSON.stringify(data), {
      encoding: 'utf8',
    });
  }

  // Main function to get data
  async function getData() {
    const document = await fetchFromWebOrCache(
      'https://news.ycombinator.com/',
      true,
    );
    const data = extractData(document);
    saveData('hacker-news-links', data);
  }
  
  getData();