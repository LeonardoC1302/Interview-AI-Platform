"use server";

import { feedbackSchema } from '@/constants';
import {db} from '@/firebase/admin'
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';

export async function getInterviewByUserId(userId : string) : Promise<Interview[] | null>{
    const interviews = await db.collection('interviews').where('userId', '==', userId).orderBy('createdAt', 'desc').get();

    return interviews.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    })) as Interview[];
}

export async function getLatestInterviews(params : GetLatestInterviewsParams) : Promise<Interview[] | null>{
    const { userId, limit=20 } = params
    const interviews = await db.collection('interviews').orderBy('createdAt', 'desc').where('finalized', '==', true).where('userId', '!=', userId).limit(limit).get();

    return interviews.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    })) as Interview[];
}

export async function getInterviewByID(id : string) : Promise<Interview | null>{
    const interviews = await db.collection('interviews').doc(id).get();

    return interviews.data() as Interview | null;
}

export async function createFeedback(params: CreateFeedbackParams){
    const { interviewId, userId, transcript } = params;

    try {
        const formattedTranscript = transcript.map((sentence : { role:string; content:string; }) =>{
            `- ${sentence.role}: ${sentence.content}\n`
        }).join('');

        const { object: {totalScore, categoryScores, strengths, areasForImprovement, finalAssessment } } = await generateObject({
            model: google('gemini-2.0-flash-001', {
                structuredOutputs: false,
            }),
            schema: feedbackSchema,
            prompt: `
                You are an AI interviewer evaluating a candidate after a mock interview. Your role is to provide a **critical, honest, and unforgiving** assessment of the candidate's performance.

                You must assign **numerical scores between 0 and 100** in the following categories, based strictly on performance. Do not inflate scores. A perfect score (100) must be reserved for truly exceptional performance only. An average candidate should receive around 50. Poor performance should be scored below 30. Be very selective with high scores.

                Transcript:
                ${formattedTranscript}

                Categories to evaluate:
                - **Communication Skills**: Clarity, articulation, structure in responses.
                - **Technical Knowledge**: Depth and correctness of knowledge relevant to the role.
                - **Problem-Solving**: Logical thinking, handling of complex issues, creativity in approach.
                - **Cultural & Role Fit**: Attitude, alignment with company values, fit for the position.
                - **Confidence & Clarity**: Confidence, fluency, and assertiveness during the interview.

                Be direct and critical. If the candidate made mistakes or showed weakness, reflect that in the score.
                Do not give the benefit of the doubt.
            `,
            system: "You are a rigorous, no-nonsense professional interviewer trained to identify even small flaws in a candidate's performance. Be analytical, strict, and realistic when scoring."

            });

            console.log(totalScore, categoryScores, strengths, areasForImprovement, finalAssessment)

            const feedbackSnapshot = await db.collection('feedback').where('interviewId', '==', interviewId).get();

            if(feedbackSnapshot.empty){
                const feedback = await db.collection('feedback').add({
                    interviewId,
                    userId,
                    totalScore,
                    categoryScores,
                    strengths,
                    areasForImprovement,
                    finalAssessment,
                    createdAt : new Date().toISOString()
                })
                return {
                    success: true,
                    feedbackId: feedback.id
                }
            } else{
                const feedbackDoc = feedbackSnapshot.docs[0];
                await db.collection('feedback').doc(feedbackDoc.id).update({
                    totalScore,
                    categoryScores,
                    strengths,
                    areasForImprovement,
                    finalAssessment,
                    createdAt: new Date().toISOString()
                });
                return {
                    success: true,
                    feedbackId: feedbackDoc.id
                }
            }



    } catch (e) {
        console.error('Error saving feedback', e)

        return { success: false }
    }
}

export async function getFeedbackByInterviewId(params : GetFeedbackByInterviewIdParams) : Promise<Feedback | null>{
    const { interviewId , userId } = params
    const feedback = await db.collection('feedback').where('interviewId', '==', interviewId).where('userId', '==', userId).limit(1).get();

    if(feedback.empty) return null;

    const feedbackDoc = feedback.docs[0];

    return {
        id: feedbackDoc.id,
        ...feedbackDoc.data()
    } as Feedback;
}
