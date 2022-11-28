import { Application, Request, Response } from 'express';
import { IOController } from '../controllers/io_controller';


export class IORoutes {

    private io_controller: IOController = new IOController();

    public routes(app: Application) {
        
        app.get('/logs/list', (req: Request, res: Response) => {
            this.io_controller.listLogs(req, res);
        });

        app.get('/log/tail', (req: Request, res: Response) => {
            this.io_controller.tailLog(req, res);
        });

    }
}