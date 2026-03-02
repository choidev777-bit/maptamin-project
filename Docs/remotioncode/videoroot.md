import React from "react";
import { Composition } from "remotion";
import { IntroSequence } from "./Intro";
import { NewVideoSequence } from "./NewVideo";


export const RemotionRoot: React.FC = () => {
    return (
        <>
          
            <Composition
                id="Herovideo"
                component={NewVideoSequence}
                durationInFrames={840}
                fps={60}
                width={900}
                height={1125}
            />
        </>
    );
};



