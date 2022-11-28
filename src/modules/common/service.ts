import { Response } from 'express';
import { HTTP_RESPONSE_STATUS } from './model';

export function successResponse(message: string, data: any, res: Response) {
    res.status(HTTP_RESPONSE_STATUS.SUCCESS).json({
        status: 'SUCCESS',
        msg: message,
        data
    });
}

export function invalidResponse(message: string, data: any, res: Response) {
    res.status(HTTP_RESPONSE_STATUS.BAD_REQUEST).json({
        status: 'INVALID',
        msg: message,
        data
    });
}

export function errorResponse(message: string, data: any, res: Response) {
    res.status(HTTP_RESPONSE_STATUS.INTERNAL_SERVER_ERROR).json({
        status: 'ERROR',
        msg: message,
        data
    });
}