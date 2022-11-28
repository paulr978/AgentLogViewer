import express from "express";
import { IORoutes } from "../routes/io_routes";
import process from 'process';

// used for debug purposes
export const isDebug = Boolean(process.env.IS_DEBUG);


/**
 * Agent App representing express wrapper
 * 
 */
export class Agent {
   public app: express.Application;

   private io_routes: IORoutes = new IORoutes();

   constructor() {
      this.app = express();
      this.io_routes.routes(this.app);
   }

}
